"""SingTech RAG gateway on the RTX 3050 box.

granite-embedding:278m retrieves, jev reranks and scores risk, gemma4:e4b writes the cited answer and reads images.
Bound to 127.0.0.1:8088; reached through the Cloudflare Access tunnel or, from the app on this box, over loopback.
"""

import asyncio
import base64
import hashlib
import hmac
import json
import os
import re
import time
from collections import OrderedDict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import httpx
import numpy as np
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
JEV = os.environ.get("JEV_URL", "http://127.0.0.1:8017")
EMBED_MODEL = "granite-embedding:278m"
GEN_MODEL = "gemma4:e4b"
KEEP_ALIVE = "60m"
# Every gemma call sends the same num_ctx and num_batch: changing either reloads the model (about 9 s) and can evict granite from VRAM.
GEN_OPTIONS = {"num_ctx": 2048, "num_predict": 180, "temperature": 0.2, "num_batch": 512}
# num_gpu 99 pins every granite layer to the GPU; Ollama's estimate otherwise splits it with the CPU.
EMBED_OPTIONS = {"num_ctx": 4096, "num_gpu": 99}
DATA = Path(os.environ.get("RAG_DATA", Path.home() / "singtech-rag" / "data"))
CHUNK_CHARS = 900  # granite-embedding reads 512 tokens; ~900 chars stays inside it
PASSAGE_CHARS = 650
UPLOAD_PASSAGES = 2  # an uploaded document contributes its best chunks; the 2048-token window holds about 6 passages
BILL_RE = re.compile(r"SGT-INV-\d{4}-\d{4}", re.I)
# Emails, +international or SG 8-digit phones, NRIC/FIN. Never bill IDs (SGT-INV-2026-8841) or ISO dates.
PII_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+|(?<![\w-])\+\d[\d ]{7,}\d|(?<![\w-])[689]\d{3} ?\d{4}(?![\w-])|\b[STFGM]\d{7}[A-Z]\b")

# Identical on every call, so Ollama reuses the cached KV for this prefix and only reads the new passages.
SYSTEM = (
    "You are SingTech, the deal assistant for Singtel Enterprise account executives in Singapore. "
    "Use only the numbered passages. Cite each fact with its passage number, like [2] or [1, 3]. "
    "Lead with the direct answer. Quote exact figures, SGD amounts, dates, bill IDs, owners and deadlines from the passages; never invent them. "
    "If passages disagree, trust the most recent date. Sample accounts are fictional; do not call them real customers. "
    "When a passage is an uploaded document (upload) and the question is about it, answer from that document only.\n"
    "Reply in exactly this format:\n"
    "SUMMARY: two or three sentences answering the question, with citations.\n"
    "ACTIONS:\n- next step with owner and due date when known [n]\n- at most three steps\n"
    "Leave out ACTIONS when the passages give no next step. "
    "If the passages do not answer it, reply 'SUMMARY: The records do not cover this.' with no ACTIONS. "
    "Never output personal emails, phone numbers or ID numbers. Plain text, no markdown, no emojis, no em dashes, at most 120 words."
)

OCR_PROMPT = (
    "Transcribe every piece of readable text in this image, line by line, exactly as written. "
    "If it is an invoice, bill, or contract, then list: document number, dates, parties, line items, amounts with currency, and status. "
    "Plain text only."
)


class Doc(BaseModel):
    id: str = Field(max_length=160)
    title: str = Field(max_length=300)
    text: str = Field(max_length=40000)
    source: str = Field(default="", max_length=2048)  # Google News redirect URLs run past 700 chars
    kind: str = Field(default="doc", max_length=40)


class IndexReq(BaseModel):
    docs: list[Doc] = Field(max_length=10000)


class QueryReq(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    account_id: str | None = Field(default=None, max_length=160)
    top_k: int = Field(default=4, ge=1, le=8)
    # Text the rep uploaded (already redacted by the app); its best chunks join the passages.
    context: str | None = Field(default=None, max_length=24000)
    context_title: str = Field(default="Uploaded document", max_length=160)
    session_id: str | None = Field(default=None, max_length=80)


class VisionReq(BaseModel):
    image_b64: str = Field(min_length=16, max_length=9_000_000)


class AssessReq(BaseModel):
    text: str = Field(min_length=10, max_length=20000)


# Defence in depth: the tunnel must not be the only gate, so every call except /health needs this key.
GATEWAY_KEY = os.environ.get("RAG_GATEWAY_KEY", "")


def require_key(authorization: str = Header(default="")) -> None:
    if not GATEWAY_KEY or not hmac.compare_digest(authorization, f"Bearer {GATEWAY_KEY}"):
        raise HTTPException(401, "unauthorized")


class LRU:
    """Small time-bounded LRU; one uvicorn worker keeps it coherent."""

    def __init__(self, size: int, ttl_s: float):
        self.size, self.ttl, self.items = size, ttl_s, OrderedDict()

    def get(self, key):
        hit = self.items.get(key)
        if hit is None or time.monotonic() - hit[0] > self.ttl:
            self.items.pop(key, None)
            return None
        self.items.move_to_end(key)
        return hit[1]

    def put(self, key, value) -> None:
        self.items[key] = (time.monotonic(), value)
        self.items.move_to_end(key)
        while len(self.items) > self.size:
            self.items.popitem(last=False)

    def clear(self) -> None:
        self.items.clear()


answers = LRU(256, 600)  # repeat bill-ID and account questions return from memory
query_vectors = LRU(1024, 3600)
memory = LRU(500, 3600)  # session_id -> last turns, so follow-ups ("its renewal") resolve
MEMORY_TURNS = 3
# Everything lives in RAM: chunks, their vectors, and an entity map (account, bill ID, product -> chunk rows) built at load.
index: dict = {"chunks": [], "emb": np.zeros((0, 1), dtype=np.float32), "entities": {}}
PRONOUN_RE = re.compile(r"\b(it|its|they|their|them|he|she|his|her|(?:the|this|that) (?:account|customer|invoice|bill|deal|company))\b", re.I)
ENTITY_STOP = {"singtel", "singtech", "account", "group", "the", "and"}
http: httpx.AsyncClient


def clean(text: str) -> str:
    return PII_RE.sub("[redacted]", text).replace("—", ", ").replace("–", "-")


class SafeStream:
    """Releases streamed text only at word boundaries held back from the tail, so redaction never splits a PII match."""

    HOLD = 16  # longer than any partial phone number ("9123 456"); emails have no spaces so a word cut keeps them whole

    def __init__(self) -> None:
        self.raw, self.sent = "", 0

    def push(self, token: str) -> str:
        self.raw += token
        limit = len(self.raw) - self.HOLD
        cut = self.raw.rfind(" ", self.sent, max(limit, self.sent) + 1) if limit > self.sent else -1
        if cut <= self.sent:
            return ""
        for m in PII_RE.finditer(self.raw, self.sent):
            if m.start() < cut < m.end():
                cut = m.start()
        return self._emit(cut)

    def finish(self) -> str:
        return self._emit(len(self.raw))

    def _emit(self, end: int) -> str:
        if end <= self.sent:
            return ""
        out, self.sent = clean(self.raw[self.sent : end]), end
        return out


def entity_map(chunks: list[dict]) -> dict[str, list[int]]:
    """Lower-cased entity -> chunk rows. Entities are doc titles' leading names, bill IDs and incident IDs."""
    out: dict[str, set[int]] = {}
    for i, c in enumerate(chunks):
        name = re.split(r"[:(,]| - ", c["title"])[0].strip().lower()
        if len(name) >= 4 and name not in ENTITY_STOP:
            out.setdefault(name, set()).add(i)
        for ident in re.findall(r"\b(?:SGT-INV-\d{4}-\d{4}|INC-\d{4}-\d{4})\b", c["text"], re.I):
            out.setdefault(ident.lower(), set()).add(i)
    # Reps say "Meridian", not "Meridian Arcwell Group": a first word used by only one name becomes an alias.
    firsts: dict[str, list[str]] = {}
    for name in [k for k in out if " " in k]:
        firsts.setdefault(name.split()[0], []).append(name)
    for word, names in firsts.items():
        if len(names) == 1 and len(word) >= 5 and word not in ENTITY_STOP and word not in out:
            out[word] = out[names[0]]
    # Names that cover a large share of the corpus are not distinctive.
    return {k: sorted(v) for k, v in out.items() if len(v) <= 40}


def load_index() -> None:
    chunks_file, emb_file = DATA / "chunks.json", DATA / "emb.npy"
    if chunks_file.exists() and emb_file.exists():
        index["chunks"] = json.loads(chunks_file.read_text())
        index["emb"] = np.load(emb_file)
        index["entities"] = entity_map(index["chunks"])


def mentioned(question: str) -> set[int]:
    q = question.lower()
    return {row for name, rows in index["entities"].items() if name in q for row in rows}


def recall(session_id: str | None) -> list[dict]:
    return memory.get(session_id) or [] if session_id else []


def remember(session_id: str | None, question: str, answer: str) -> None:
    if session_id:
        summary = answer.split("ACTIONS:")[0].replace("SUMMARY:", "").strip()[:300]
        memory.put(session_id, (recall(session_id) + [{"q": question[:200], "a": summary}])[-MEMORY_TURNS:])


def split(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    out, buf = [], ""
    for s in sentences:
        while len(s) > CHUNK_CHARS:  # CSV rows and OCR lines can run long without sentence breaks
            out.append(s[:CHUNK_CHARS])
            s = s[CHUNK_CHARS:]
        if buf and len(buf) + len(s) > CHUNK_CHARS:
            out.append(buf)
            buf = ""
        buf = f"{buf} {s}".strip()
    if buf:
        out.append(buf)
    return out


def chunk(doc: Doc) -> list[dict]:
    return [{"id": f"{doc.id}#{i}", "doc_id": doc.id, "title": doc.title, "source": doc.source, "kind": doc.kind, "text": t} for i, t in enumerate(split(doc.text))]


async def embed(texts: list[str]) -> np.ndarray:
    vecs = []
    for i in range(0, len(texts), 32):
        r = await http.post(f"{OLLAMA}/api/embed", json={"model": EMBED_MODEL, "input": texts[i : i + 32], "keep_alive": KEEP_ALIVE, "options": EMBED_OPTIONS})
        r.raise_for_status()
        vecs.extend(r.json()["embeddings"])
    v = np.asarray(vecs, dtype=np.float32)
    return v / (np.linalg.norm(v, axis=1, keepdims=True) + 1e-9)


async def embed_question(q: str) -> np.ndarray:
    hit = query_vectors.get(q)
    if hit is None:
        hit = (await embed([q]))[0]
        query_vectors.put(q, hit)
    return hit


async def jev(state: str, questions: dict, timeout: float = 10) -> dict:
    r = await http.post(f"{JEV}/v1/systemone", json={"model": "jev-latest", "state": state[:24000], "questions": questions}, timeout=timeout)
    r.raise_for_status()
    return r.json()["answers"]


async def relevance(question: str, c: dict) -> float:
    try:
        return float((await jev(f"Question: {question}\nPassage: {c['title']}. {c['text']}", {"rel": {"type": "noul", "instructions": "Does the passage help answer the question?"}}))["rel"]["noul"])
    except (httpx.HTTPError, KeyError, ValueError):
        return 0.5


async def upload_passages(req: QueryReq, qv: np.ndarray) -> list[dict]:
    if not req.context:
        return []
    pieces = split(req.context)[:40]
    if len(pieces) <= UPLOAD_PASSAGES:
        best = pieces
    else:
        emb = await embed(pieces)
        best = [pieces[int(i)] for i in np.argsort(-(emb @ qv))[:UPLOAD_PASSAGES]]
    return [{"id": f"upload#{i}", "doc_id": "upload", "title": req.context_title, "source": "", "kind": "upload", "text": t, "score": 1.0} for i, t in enumerate(best)]


def search_text(req: QueryReq) -> str:
    """A short follow-up with a pronoun inherits the previous question, so "what about its renewal" stays on the same account."""
    turns = recall(req.session_id)
    if turns and len(req.question.split()) <= 12 and PRONOUN_RE.search(req.question):
        return f"{turns[-1]['q']} {req.question}"
    return req.question


async def retrieve(req: QueryReq, timing: dict) -> list[dict]:
    text = search_text(req)
    t0 = time.monotonic()
    qv = await embed_question(text)
    timing["embed_ms"] = round((time.monotonic() - t0) * 1000)
    uploads_task = asyncio.create_task(upload_passages(req, qv))
    top: list[dict] = []
    if index["chunks"]:
        sims = index["emb"] @ qv
        for row in mentioned(text):
            sims[row] += 0.35  # a named account, bill or incident outranks generic neighbours
        bills = {b.upper() for b in BILL_RE.findall(text)}
        for i, c in enumerate(index["chunks"]):
            if bills and any(b in c["text"].upper() or b == c["doc_id"].upper() for b in bills):
                sims[i] += 1.0  # exact bill ID beats any semantic neighbour
            if req.account_id and (req.account_id in c["doc_id"] or req.account_id in c["text"]):
                sims[i] += 0.05
        k = max(1, req.top_k - (UPLOAD_PASSAGES if req.context else 0))
        # At most three passages per document, so one long record cannot fill every slot.
        per_doc: dict[str, int] = {}
        for i in np.argsort(-sims)[: k * 6]:
            c = index["chunks"][int(i)]
            if per_doc.get(c["doc_id"], 0) < 3:
                per_doc[c["doc_id"]] = per_doc.get(c["doc_id"], 0) + 1
                top.append(c | {"score": float(sims[i])})
            if len(top) == k:
                break
    return (await uploads_task) + top


async def judge(question: str, passages: list[dict]) -> list[dict]:
    """jev scores every passage at once; blended 50/50 with retrieval similarity. Uploads keep their score."""
    corpus = [c for c in passages if c["kind"] != "upload"]
    rel = await asyncio.gather(*(relevance(question, c) for c in corpus))
    blended = {c["id"]: 0.5 * c["score"] + 0.5 * p for c, p in zip(corpus, rel)}
    return [c | {"score": blended.get(c["id"], c["score"])} for c in passages]


def prompt_for(question: str, passages: list[dict], turns: list[dict]) -> str:
    # The best passage goes in whole; the rest are trimmed so prompt reading stays under ~300 ms.
    body = "\n\n".join(f"[{n}] {c['title']} ({c['kind']}): {c['text'] if n == 1 else c['text'][:PASSAGE_CHARS]}" for n, c in enumerate(passages, 1))
    earlier = "".join(f"Earlier question: {t['q']}\nEarlier answer: {t['a']}\n" for t in turns[-2:])
    return f"Today is {time.strftime('%Y-%m-%d')}.\nPassages:\n{body}\n\n{earlier}Question: {question}\n"


def citations(passages: list[dict]) -> list[dict]:
    return [{"id": c["doc_id"], "title": c["title"], "source": c["source"], "snippet": c["text"][:280], "score": round(float(c["score"]), 3)} for c in passages]


async def generate_stream(prompt: str) -> AsyncIterator[str]:
    payload = {"model": GEN_MODEL, "system": SYSTEM, "prompt": prompt, "stream": True, "think": False, "keep_alive": KEEP_ALIVE, "options": GEN_OPTIONS}
    async with http.stream("POST", f"{OLLAMA}/api/generate", json=payload, timeout=60) as r:
        r.raise_for_status()
        async for line in r.aiter_lines():
            if not line:
                continue
            d = json.loads(line)
            if d.get("response"):
                yield d["response"]
            if d.get("done"):
                break


def cache_key(req: QueryReq) -> str:
    norm = re.sub(r"\s+", " ", req.question.strip().lower())
    ctx = hashlib.sha1(req.context.encode()).hexdigest() if req.context else ""
    # Follow-ups depend on the conversation, so they are cached per session; standalone questions are shared.
    session = req.session_id if PRONOUN_RE.search(req.question) else ""
    return json.dumps([norm, req.account_id or "", ctx, req.top_k, session])


def sse(event: str, data: dict) -> bytes:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n".encode()


async def answer_events(req: QueryReq) -> AsyncIterator[bytes]:
    """meta (citations) as soon as retrieval ends, token events as gemma writes, then done with the full redacted answer."""
    started = time.monotonic()
    ms = lambda: round((time.monotonic() - started) * 1000)  # noqa: E731
    key = cache_key(req)
    hit = answers.get(key)
    if hit:
        remember(req.session_id, req.question, hit["answer"])
        yield sse("meta", {"citations": hit["citations"], "cached": True, "ms": ms()})
        yield sse("token", {"t": hit["answer"]})
        yield sse("done", {"answer": hit["answer"], "citations": hit["citations"], "ms": ms(), "cached": True})
        return
    timing: dict = {}
    passages = await retrieve(req, timing)
    yield sse("meta", {"citations": citations(passages), "cached": False, "ms": ms(), **timing})
    # jev needs about 1 s per new question on CPU, so it judges the passages while gemma writes instead of delaying the first token.
    judging = asyncio.create_task(judge(req.question, passages))
    guard, parts = SafeStream(), []
    async for token in generate_stream(prompt_for(req.question, passages, recall(req.session_id))):
        out = guard.push(token)
        if out:
            parts.append(out)
            yield sse("token", {"t": out})
    tail = guard.finish()
    if tail:
        parts.append(tail)
        yield sse("token", {"t": tail})
    answer = "".join(parts).strip()
    try:
        cites = citations(await asyncio.wait_for(judging, timeout=3))
    except asyncio.TimeoutError:
        cites = citations(passages)
    answers.put(key, {"answer": answer, "citations": cites})
    remember(req.session_id, req.question, answer)
    yield sse("done", {"answer": answer, "citations": cites, "ms": ms(), "cached": False})


async def warm() -> None:
    # Load both models with the exact options the query path uses, so the first real question is not a cold start.
    for _ in range(5):
        try:
            await http.post(f"{OLLAMA}/api/generate", json={"model": GEN_MODEL, "prompt": "OK", "stream": False, "think": False, "keep_alive": KEEP_ALIVE, "options": {**GEN_OPTIONS, "num_predict": 1}}, timeout=120)
            await embed(["warm up"])
            return
        except httpx.HTTPError:
            await asyncio.sleep(3)  # Ollama may still be starting after a reboot


@asynccontextmanager
async def lifespan(_: FastAPI):
    global http
    http = httpx.AsyncClient(timeout=180, limits=httpx.Limits(max_connections=64))
    load_index()
    warmer = asyncio.create_task(warm())
    yield
    warmer.cancel()
    await http.aclose()


app = FastAPI(title="SingTech RAG gateway", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    loaded = []
    try:
        loaded = [{"name": m["name"], "vram": m.get("size_vram", 0), "size": m.get("size", 0)} for m in (await http.get(f"{OLLAMA}/api/ps", timeout=5)).json().get("models", [])]
    except httpx.HTTPError:
        pass
    jev_ok = False
    try:
        jev_ok = (await http.get(f"{JEV}/health", timeout=5)).status_code == 200
    except httpx.HTTPError:
        pass
    return {"ok": True, "chunks": len(index["chunks"]), "models": {"embed": EMBED_MODEL, "generate": GEN_MODEL}, "loaded": loaded, "jev": jev_ok, "cached_answers": len(answers.items), "entities": len(index["entities"]), "sessions": len(memory.items)}


@app.post("/v1/index", dependencies=[Depends(require_key)])
async def build_index(req: IndexReq) -> dict:
    chunks = [c for d in req.docs for c in chunk(d)]
    if not chunks:
        raise HTTPException(400, "no text to index")
    emb = await embed([f"{c['title']}. {c['text']}" for c in chunks])
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "chunks.json").write_text(json.dumps(chunks))
    np.save(DATA / "emb.npy", emb)
    index["chunks"], index["emb"], index["entities"] = chunks, emb, entity_map(chunks)
    answers.clear()
    return {"docs": len(req.docs), "chunks": len(chunks)}


@app.post("/v1/query/stream", dependencies=[Depends(require_key)])
async def query_stream(req: QueryReq) -> StreamingResponse:
    async def events() -> AsyncIterator[bytes]:
        try:
            async for e in answer_events(req):
                yield e
        except (httpx.HTTPError, KeyError, ValueError) as err:
            yield sse("error", {"message": type(err).__name__})

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/v1/query", dependencies=[Depends(require_key)])
async def query(req: QueryReq) -> dict:
    result: dict = {}
    async for e in answer_events(req):
        event, data = e.decode().split("\n", 2)[:2]
        payload = json.loads(data.removeprefix("data: "))
        if event == "event: meta":
            result["citations"] = payload["citations"]
        elif event == "event: done":
            result |= {"answer": payload["answer"], "citations": payload["citations"], "cached": payload["cached"]}
    return result


@app.post("/v1/vision", dependencies=[Depends(require_key)])
async def vision(req: VisionReq) -> dict:
    try:
        raw = base64.b64decode(req.image_b64, validate=True)
    except ValueError:
        raise HTTPException(400, "invalid image encoding")
    if len(raw) > 6_000_000:
        raise HTTPException(413, "image too large")
    payload = {"model": GEN_MODEL, "prompt": OCR_PROMPT, "images": [req.image_b64], "stream": False, "think": False, "keep_alive": KEEP_ALIVE, "options": {**GEN_OPTIONS, "num_predict": 700}}
    r = await http.post(f"{OLLAMA}/api/generate", json=payload, timeout=90)
    r.raise_for_status()
    return {"text": clean(r.json()["response"]).strip()}


MEDDPICC = {
    "metrics": "Does the record show quantified business metrics the customer agreed to?",
    "economicBuyer": "Is the economic buyer identified and engaged?",
    "decisionCriteria": "Are the customer's decision criteria documented?",
    "decisionProcess": "Is the customer's decision process and timeline documented?",
    "paperProcess": "Is the procurement and contract paper process mapped?",
    "identifyPain": "Is a specific business pain identified?",
    "champion": "Is there an internal champion actively selling for us?",
    "competition": "Is the competitive situation known and addressed?",
}


@app.post("/v1/assess", dependencies=[Depends(require_key)])
async def assess(req: AssessReq) -> dict:
    questions = {k: {"type": "noul", "instructions": q} for k, q in MEDDPICC.items()}
    questions["churn"] = {"type": "noul", "instructions": "Is this enterprise account at risk of churning or moving to a competitor within 12 months?"}
    answers_ = await jev(req.text, questions, timeout=30)
    return {"churnRisk": answers_["churn"]["noul"], "meddpicc": {k: answers_[k]["noul"] for k in MEDDPICC}}

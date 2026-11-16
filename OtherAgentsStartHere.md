# OtherAgentsStartHere

Handoff for any AI agent continuing SingTech. Read this, then `CLAUDE.md` (rules, which win), then the code. Keep this file current when you finish work.

## What SingTech is

An internal sales workspace for Singtel / NCS Enterprise account executives.
- Find and prioritise accounts.
- Research prospects.
- Run calls with a RAG co-pilot.
- Build proposals.
- Push approved deals into a real Salesforce org and a live Chatter deal room that judges can join by QR code.

Scope is set by the mentor update (`info/SingTech — Hackathon Build Guide.docx`, 15 Nov) and CLAUDE.md section 0. The app lives in `singtech/` (Next.js 16, React 19, TypeScript, Tailwind v4, Meta Astryx 0.7.15, Chart.js, Leaflet, zod, pnpm).

## Run and check

```bash
cd singtech
pnpm install
pnpm build && pnpm start         # http://localhost:3000 (or pnpm dev)
pnpm typecheck && pnpm test && pnpm lint && pnpm build
```

The copy and dash guard is `tests/copy-guard.test.ts`; also run the grep in CLAUDE.md section 1.

## Secrets and config

Secrets live in `singtech/.env.local`. Never print them.

| Variable(s) | What it is |
|---|---|
| `SALESFORCE_INSTANCE_URL`, `SALESFORCE_CONSUMER_KEY`, `SALESFORCE_CONSUMER_SECRET` | Salesforce Developer Edition, OAuth client credentials (API v66.0). |
| `SALESFORCE_DEAL_ROOM_GROUP_ID` | Chatter group "Singtel Enterprise Deal Room" (public). |
| `RAG_GATEWAY_URL` = `https://singtel-rag.manansethia.com`, plus `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` | Cloudflare Access service token for the tunnel to the home GPU box. |
| `NEXT_PUBLIC_DEAL_ROOM_URL` (optional) | Public URL encoded in the Pitch QR. It must be a tunnel or LAN URL, since localhost does not work on phones. |

## Architecture (where things are)

**Salesforce: `src/lib/salesforce.ts`**
- Auth, upsert Account and Opportunity by name, create Task, post to and read the Chatter group, comment on posts.
- Route `POST /api/salesforce/push {companyId, option, lead?}` writes Account, Opportunity and Task plus a deal-room post.
- Falls back to `singtech/.data/crm.json` when Salesforce is unreachable.

**Deal room: `src/lib/dealroom.ts`**
- `/deal-room` is a public page.
- `GET /api/deal-room/feed`: polled every 5s; runs the bot via `after()` at most every 8s.
- `POST /api/deal-room/post`: rate limited to 5 per minute per IP.
- `GET|POST /api/salesforce/chatter/sync`: runs the bot directly.
- The bot answers posts that mention @SingTech, ask a question, or contain a bill ID, and replies as a Chatter comment prefixed `SingTech AI:`.

**Public guard: `src/proxy.ts`**
- Any host other than localhost only gets `/deal-room` and `/api/deal-room/*`. Tested in `tests/proxy.test.ts`.

**RAG: `src/lib/rag.ts`**
- `queryRag()` calls the gateway `POST /v1/query` (60s timeout). It falls back to local keyword retrieval.
- Corpus, from `localDocuments()`:
  - catalogue and accounts;
  - `historyDocuments()` (`src/lib/history.ts`: 7 sample accounts, invoices such as `SGT-INV-2026-8841`, meeting minutes, SLA incidents, reps, playbooks);
  - cached news signals (`src/lib/signals/`);
  - official Singtel filings (`src/data/filings.json`, 116 pages extracted from `news/*.pdf`).
- `POST /api/rag/reindex` pushes the corpus to the gateway.

**News signals: `src/lib/signals/`**
- `GET /api/signals`.
- Keyless feeds: Google News RSS (demo-only ToS), Business Times, CNA, e27, GeBIZ tenders, and GDELT (currently rate-limited).
- Rule classifier mapping signals to catalogue products, with an additive score.
- Seed of 32 verified items in `src/data/signals_seed.json`.

**History and sales method: `src/lib/history.ts`**
- MEDDPICC (0-16), on-net / near-net / off-net site feasibility, the 12-18 month pre-renewal window, SAP-to-Oracle billing friction, competitors, outcome-based product mix, and NCS multi-LOB routing.
- Flagship sample account: `acct-meridian-sg`.

**UI**
- Astryx `AppShell` + `SideNav` (`src/components/shell/`).
- Pages under `src/app/(workspace)/`; the public deal room at `src/app/deal-room/`.
- Pitch QR is `src/components/dealroom/PitchQrButton.tsx`.
- Record pages: `src/components/account/`; proposals: `src/components/proposal/`; news toasts: `src/components/shell/SignalWatcher.tsx`; logos: `src/components/ui/CompanyLogo.tsx` with `src/data/logos.json`.

## Home GPU box (`ssh manan@buildabot.lykoi-typhon.ts.net`, key auth; no sudo for agents)

**Hardware:** RTX 3050 6GB, NVIDIA driver 620.70. Everything runs as `systemd --user` units with linger enabled.

| Unit | What it runs |
|---|---|
| `ollama.service` | `~/.local/ollama`, 127.0.0.1:11434, with `OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_KV_CACHE_TYPE=q8_0`, `OLLAMA_MAX_LOADED_MODELS=2`, `OLLAMA_KEEP_ALIVE=60m`, `OLLAMA_CONTEXT_LENGTH=4096`. Models: `granite-embedding:278m`, `gemma4:e4b`. |
| `jev.service` | `~/singtech-rag/bin/jev serve` on 127.0.0.1:8017, CPU (yes/no probability model, used for reranking and churn / MEDDPICC scoring). |
| `singtech-rag.service` | FastAPI gateway `~/singtech-rag/gateway/app.py` (source of truth: `singtech/rag-gateway/`) on 127.0.0.1:8088. Every Ollama call sends `keep_alive: "60m"` and `options.num_ctx: 4096`. Endpoints: `GET /health`, `POST /v1/index`, `POST /v1/query`, `POST /v1/assess`. |

- **Deploy:** `scp singtech/rag-gateway/app.py manan@buildabot.lykoi-typhon.ts.net:singtech-rag/gateway/` then `systemctl --user restart singtech-rag`.
- **Tunnel:** cloudflared is a system service with a token-managed tunnel. Ingress `singtel-rag.manansethia.com` maps to `127.0.0.1:8088`, configured in the Cloudflare dashboard.

## Data honesty rules that bit us

- Existing customers are fictional and labelled "Sample account". Real companies are prospects only.
- **Do not use `news/*.md` or `news/articles/*.md`** (Gemini-written). They have no source URLs, wrong years (for example, the GB300 deployment was 28 Oct 2026, not 2024) and unsourced specifics. Use the official PDFs (already in `filings.json`) or pages you opened yourself.
- STT GDC: S$6.6B for the remaining 82% at a S$13.8B enterprise value. TM Nxera Johor: 280MW is secured power, and the campus is designed for 200MW+.

## Status (update this section when you finish)

- **Hosted (16 Nov):** https://singtech.manansethia.com runs on the GPU box as `systemctl --user` unit `singtech-web` (127.0.0.1:3000, published by the system cloudflared). Deploy with `singtech/deploy/deploy.sh` (rsync, install, build, restart); the server keeps its own `~/singtech-app/.env.local` with `RAG_GATEWAY_URL=http://127.0.0.1:8088` (loopback, no Cloudflare hop).
- **Access gate:** every page and API needs the `st_session` cookie from `/login` (`SINGTECH_ACCESS_PASSWORD`, `SINGTECH_SESSION_SECRET`). The proxy sends `Cloudflare-CDN-Cache-Control: no-store` on gated responses; Cloudflare had cached pages for a year before that (served without login, and stale builds forced full reloads). Keep a Cloudflare cache-bypass rule for the hostname.
- **RAG:** streaming SSE (`/api/rag/stream`), first words about 0.3 s on the box and 0.7 s through the tunnel, full answers 1 to 2 s, repeats from an in-RAM cache. jev scores passages while gemma writes. Overview docs (prospects by country, customers, open invoices) answer list questions; when the records do not cover a question, recent news (Bing News RSS) is searched and the answer is rewritten with article links (`restart` event).
- **Salesforce:** runs as user SingTech AI (Salesforce Integration licence). The deal room uses FeedItem / FeedComment / SOQL on CollaborationGroupFeed (REST daily limit), not the Chatter API, whose hourly per-user limit the 3 s polling exhausted. Task creation returns NOT_FOUND for this licence and is skipped; the next step goes to Opportunity.NextStep and the deal-room post. Fields SingTech AI cannot edit are dropped and the write retried once (logged).
- **Agent:** rule planner (`src/lib/agent/plan.ts`), cursor runtime (`src/components/agent/`); state lives at module level and in sessionStorage so a shell remount or full reload resumes the run. Every Salesforce write stops at an approval dialog.
- **Not loaded on purpose:** Gemini notes in `news/*.md` and `news/articles/` (no source links; at least one attribution looked wrong). Only the official PDFs are in the corpus (`src/data/filings.json`).
- **Checks:** `scratchpad/verify/flows.mjs` (session scratchpad) covers login, overlay contrast, news brief links, answer latency, CSV and image uploads, the two agent workflows, presentation mode and the pitch QR; all pass on the public site.

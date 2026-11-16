"""Self-checks for the parts of the gateway with no model in the loop. Run: uv run python test_app.py"""

from app import LRU, PII_RE, SafeStream, split


def stream(tokens: list[str]) -> str:
    s = SafeStream()
    return "".join([s.push(t) for t in tokens] + [s.finish()])


# A phone number split across tokens is still redacted, and nothing else is lost.
text = "SUMMARY: Call the AP lead on +65 9123 4567 today about SGT-INV-2026-8841 [1]. ACTIONS:\n- Reissue by 2026-11-27 [2]"
tokens = [text[i : i + 3] for i in range(0, len(text), 3)]
out = stream(tokens)
assert "9123" not in out and "[redacted]" in out, out
assert "SGT-INV-2026-8841" in out and "2026-11-27" in out, out
assert out == PII_RE.sub("[redacted]", text), out

# Emails split mid-token too.
assert "ap.lead@example.com" not in stream(["Mail ap.", "lead@exa", "mple.com", " for the code."])

# LRU evicts oldest and honours its size.
c = LRU(2, 60)
c.put("a", 1), c.put("b", 2), c.get("a"), c.put("c", 3)
assert c.get("b") is None and c.get("a") == 1 and c.get("c") == 3

# Long CSV-like lines are cut to chunk size.
assert all(len(p) <= 900 for p in split("x," * 2000))
print("ok")

# Entity map: names and bill IDs point at their chunks; follow-ups borrow the previous question.
import app as gw
rows = [{"title": "Meridian Arcwell Group: account history", "text": "Invoice SGT-INV-2026-8841 is disputed."}, {"title": "Quantum-Safe Network", "text": "QSN."}]
m = gw.entity_map(rows)
assert m["meridian arcwell group"] == [0] and m["sgt-inv-2026-8841"] == [0] and m["meridian"] == [0], m
gw.remember("s1", "Why is SGT-INV-2026-8841 disputed?", "SUMMARY: The credit was not netted [1].\nACTIONS:\n- Reissue")
assert gw.recall("s1")[0]["a"] == "The credit was not netted [1]."
assert gw.search_text(gw.QueryReq(question="When is it due?", session_id="s1")).startswith("Why is SGT-INV-2026-8841")
assert gw.search_text(gw.QueryReq(question="List all renewals this quarter", session_id="s1")) == "List all renewals this quarter"
print("ok memory")

# An answer cut off by the token cap ends on a whole sentence or bullet.
assert gw.complete("SUMMARY: Done [1].\nACTIONS:\n- Call the CIO [1]\n- Propose a ") == "SUMMARY: Done [1].\nACTIONS:\n- Call the CIO [1]"
assert gw.complete("SUMMARY: First fact [1]. Second fact is cut off mid") == "SUMMARY: First fact [1]."
assert gw.complete("SUMMARY: Done [1].\nACTIONS:\n- Half") == "SUMMARY: Done [1]."
assert gw.complete("SUMMARY: Complete answer [2].") == "SUMMARY: Complete answer [2]."
print("ok complete")

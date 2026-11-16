# SingTech AI

Sales workspace for Singtel Enterprise account executives. Built for the Singapore-India hackathon by Team EME.

The app drafts and prepares; a person approves before anything reaches a customer or is saved as final in Salesforce.

## Layout

| Path | What it is |
| --- | --- |
| `singtech/` | Web app (Next.js 16, TypeScript, Astryx, pnpm). Start with `singtech/README.md`. |
| `singtech/rag-gateway/` | Source of truth for the RAG gateway (FastAPI). |
| `singtech-rag/` | Server bundle: gateway copy, systemd units, jev binaries, jev model, index data. |
| `singtech-hackathon-sales-copilot/`, `singtech-hackathon-accounting-ai/` | Team reference projects. |
| `info/`, `news/` | Hackathon brief and research notes. |
| `CLAUDE.md`, `STARTHere.md`, `OtherAgentsStartHere.md` | Project rules and handover notes. |

## Run the app

```
cd singtech
cp .env.example .env.local
pnpm install
pnpm dev
```

Opens on http://localhost:3000. It works with no network and no keys, using cached data.

## Models

| Model | Role | Where it lives |
| --- | --- | --- |
| gemma4:e4b | Writes the cited answer and reads images | Ollama (`ollama pull gemma4:e4b`) |
| granite-embedding:278m | Retrieval embeddings | Ollama (`ollama pull granite-embedding:278m`) |
| jevos-v5 (OpenVINO int8) | Reranking and risk scoring | `singtech-rag/models/model/` |

GitHub rejects files over 100 MB, so the jev weights are stored as seven parts. Rebuild the file and check it:

```
cd singtech-rag/models/model
cat openvino_model.bin.part-* > openvino_model.bin
shasum -a 256 openvino_model.bin
# 413b40a85163260e4cd9dfe278e5e068f343920bc9e08741d53659ca39fecb81
```

`singtech-rag/install.sh` shows how the server fetches the same release from its source.

## Secrets

Secrets live only in `singtech/.env.local` and `singtech-rag/gateway/.env`, both git-ignored. `singtech/.env.example` lists the names with empty values.

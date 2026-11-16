# SingTech

Customer engagement, account growth, and ecosystem co-sell workspace for Singtel Enterprise account teams. Built with Next.js 16 (App Router), Meta Astryx, Chart.js, and Leaflet. Layout follows the Cruip Mosaic dashboard template (reference copy in `../design-refs/`).

## Run

```bash
pnpm install
pnpm build && pnpm start     # or: pnpm dev
```

Open http://localhost:3000. The app is self-contained: all data ships in `src/data/`. Map tiles (Esri World Light Gray) need internet; pins and corridor arcs still render without them.

## Workspaces

| Route | Page |
| --- | --- |
| `/` | Overview: KPI band, retention watchlist (health, next best action, revenue at stake), pipeline by stage, next steps, renewals (with the 12-18 month pre-renewal window), latest signals |
| `/accounts`, `/accounts/customers`, `/accounts/prospects` | Account lists with logos, health, MEDDPICC and on-net badges, prospect triggers |
| `/accounts/[id]` | Account record: account health with evidence links and one next best action, key facts, MEDDPICC, site feasibility, billing, meetings, service and support cases, key contacts, competition, product mix, news, "Ask about this account", push to Salesforce |
| `/ai` | AI Workspace: one chat window with saved chats; uploads PDF, Excel, CSV, .eml, WhatsApp and Telegram exports, images |
| `/salesforce` | Live open opportunities, recent accounts, deal room posts and approved pushes, read as SingTech AI. Salesforce forbids framing its pages (`X-Frame-Options: DENY`), so records link out instead of an iframe |
| `/accounts/prospects/new` | Add prospect: identify, research, review, save |
| `/copilot` | Co-Pilot & RAG: bill-ID and account assistant, call prep, live notes with objection help, wrap-up |
| `/proposals`, `/proposals/[id]` | Deal desk and proposal builder: catalogue lines, term, discount, MRC/ARR/TCV, approval states |
| `/proposal/[id]` | Customer document (no internal data) |
| `/insights`, `/insights/map` | Performance (pilot targets, sourced benchmarks) and coverage map |
| `/activity` | Every dispatch and Salesforce push this session, with the redacted payload |
| `/deal-room` | Public deal room backed by the Salesforce Chatter group; the only page served to non-localhost hosts |

## Optional live integrations

Copy `.env.example` to `.env.local`. Every integration falls back to local data when its variables are empty.

| Variables | Effect when set |
| --- | --- |
| `SALESFORCE_INSTANCE_URL`, `SALESFORCE_CONSUMER_KEY`, `SALESFORCE_CONSUMER_SECRET` | Push creates or updates Account and Opportunity with its next step (client credentials; the Integration licence has no Task access). Otherwise records go to `.data/crm.json` and the UI says "Not synced to Salesforce". |
| `SALESFORCE_DEAL_ROOM_GROUP_ID` | Deal room reads and posts the Chatter group; the bot replies as Chatter comments. |
| `RAG_GATEWAY_URL`, `RAG_GATEWAY_KEY`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` | RAG answers come from the home GPU gateway. Otherwise local keyword retrieval answers. |
| `NEXT_PUBLIC_DEAL_ROOM_URL` | Public URL encoded in the Pitch QR code. |
| `SLACK_WEBHOOK_URL`, `SALESFORCE_WEBHOOK_URL` | Deal dispatch posts redacted text (https only). |
| `ANTHROPIC_API_KEY` | Optional enhancer for Add prospect (`claude-opus-5-5`); rules answer without it. |
| `GNEWS_API_KEY`, `NEWSDATA_API_KEY`, `LOGO_DEV_TOKEN`, `DATA_GOV_SG_API_KEY` | Extra news and logo sources; the keyless feeds run without them. |

All outbound text passes `sanitizeEnterprisePayload()` in `src/lib/pii-redactor.ts` first. Restart the server after editing `.env.local`.

## Checks

```bash
pnpm typecheck && pnpm test && pnpm lint && pnpm build
```

## Data notes

- **Existing customers are fictional.** LionRock, Straits Vanguard, AeroPulse, Orchid Bay, HelixVeda, Harbourline, and Meridian Arcwell are invented accounts, as are their CUBΣ and Paragon usage signals, 14-day usage trends, and named contacts. The UI marks them "Sample account".
- **Account health is rules-based** (`src/lib/health.ts`, adapted from the team repo's account-intelligence rules): it scores the sample records (SLA incidents, support cases with satisfaction and competitor mentions, open invoices, key contacts, meetings) as of 16 Nov 2026, and every reason cites its record IDs. Contacts are recorded by role only, with no names.
- **Prospects are real companies.** The six prospects use real signals, each linked to the public article it paraphrases. They are never presented as existing Singtel customers.
- **Singtel launches and figures** are sourced to pages opened during the build. Where STARTHere.md differed from those sources, the sourced figure is used:
  - STT GDC: S$6.6B for the remaining 82% at an implied S$13.8B enterprise value; Singtel holds 25%. The deal completed on 2 Sep 2026.
  - TM Nxera Johor: 280MW is secured power, and the campus is designed for 200MW+.
  - DART: the 4 Nov 2026 launch is a training programme. QSN is a separate product.
  - NXAC: the MOU is dated 5 Nov 2026.
  - NCS: S$3.8B is FY26 full-year bookings.
- **Dropped figures:** EY £80M and the stalled-pipeline figure, the +35% DART uplift, H1 FY27 growth figures, Noida 22MW, and Airtel's stake. None of these could be verified.
- **Benchmarks:** each comes from a single company or engagement, as its source says.
- **Weighted forecast:** = existing-customer upgrades x 0.8 + prospects x 0.45, against a SGD 5.0M quarterly target (planning inputs in `src/lib/data-service.ts`).
- **ARR and ROI figures** are indicative. Pilot metrics on `/insights` are targets, not results.

# SingTech: Project Rules for Every Agent

Source of truth, in order:
1. The mentor update (15 Nov 2026) in `info/SingTech — Hackathon Build Guide.docx`, with the user's approved amendments in section 0 below.
2. This file.
3. `STARTHere.md`.
4. `info/singtech_master_blueprint_and_multi_agent_execution_harness.md` (oldest; it is superseded wherever it conflicts).

Figures that could not be verified were corrected or dropped (see "Data notes" in `singtech/README.md`). Never re-add them without opening a source.

App lives in `./singtech` (Next.js App Router, TypeScript, pnpm). Target: `http://localhost:3000`. It must work with no network and no keys, using cached data.

## 0. Product scope (mentor update, approved 15 Nov 2026)

- **User:** a Singtel Enterprise account executive whose system of record is Salesforce. SingTech drafts and prepares; a person approves before anything reaches a customer or is saved as final in Salesforce. Emails are never auto-sent.
- **Customers:** enterprises and MNCs only. No SME, SMB, or consumer accounts or products.
- **Hunting focus:** India, then Bengaluru, then logistics and manufacturing. This covers Indian companies expanding to Singapore or SEA, and MNCs present in both India and Singapore. Farming covers existing Singapore enterprise customers.
- **Catalogue** (`src/data/catalog.json`):
  - The 6 core products: 5G+, CUBΣ, Cyber Security, IoT, Mobility, Quantum-Safe Network. Each links its singtel.com product page.
  - Plus 3 extras: RE:AI, Nxera, NCS.
  - Nothing else is sold.
- **Integrations:**
  - Salesforce Developer Edition: OAuth client credentials. Create Account, Contact, Opportunity, and Task, only after the rep approves.
  - Slack incoming webhook.
  - Without credentials, a local CRM store under `singtech/.data/` keeps the same records and the UI says "Not synced to Salesforce".

## 1. Copy and content rules (UI, generated copy, Slack/CRM payloads, comments, docs)

- Zero emojis anywhere. Use Lucide or Astryx SVG icons and 6px solid status dots instead.
- Zero em dashes (U+2014) anywhere. Also avoid en dashes (U+2013) in copy. Use colons, semicolons, parentheses, commas, or a plain hyphen.
- Plain enterprise sales language: Account, Opportunity, Stage, ARR, TCV, Next step, Renewal, Proposal. No exclamation marks, no consumer tone, no marketing fluff.
- No developer jargon in the UI: never "New logo", "Whitespace", "Farming", "Hunting", "Offline", "API key", or engine names.
  - "Sample account" marks fictional accounts. "Sample data" marks their usage figures.
  - The Integrations and Activity pages may name Salesforce, Slack, and configuration state.
  - `tests/copy-guard.test.ts` enforces this.
- Verify before reporting done: `grep -rnP '[\x{2014}\x{2013}]|[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' singtech/src` must return nothing.

## 2. Visual rules (updated 15 Nov 2026 by the user)

- No purple, violet, indigo, or neon colours.
- Singtel red `#E60012` (hover `#C8000F`) and black/ink `#0A0A0C` are surfaces, not just accents: dark or black-to-red gradient bands for the sidebar, page heroes, KPI heroes and section headers. White `#FFFFFF` and canvas `#F8F9FA` carry dense content.
- Tasteful gradients, gloss (subtle top highlight), glassmorphism (backdrop-blur translucent panels over dark or red bands), and minimalism are wanted.
- Strong contrast everywhere: no light-grey boxes that merge with the background, and no superficial nested boxes. Use one clear window per section, with a clear border or surface contrast. Text meets WCAG AA.
- Badges only for workflow states; status dots always paired with a word.
- Real company logos for every real company (prospects, partners), via `src/data/logos.json` and `public/logos/`. Fictional sample accounts use initials.
- Fonts:
  - IBM Plex Sans for everything.
  - IBM Plex Mono only for identifiers.
  - `tabular-nums` for numbers, right-aligned in tables.
- Charts (Chart.js): no pie, donut, or gauge.
- Motion: `180ms cubic-bezier(0.16, 1, 0.3, 1)`. Respect `prefers-reduced-motion`, including in Chart.js.

## 3. Layout rules

- **Shell:** Astryx `AppShell` + `SideNav`.
  - Labelled sidebar, 240px wide, collapsible to a 48px rail with tooltips. The state persists.
  - The sidebar has grouped sections and sub-items; it is the only place for page navigation.
  - The top bar holds breadcrumbs, a Ctrl+K command search, a "New" menu, the bell, and the user menu. Demo controls live in the user menu.
- **Desktop (>= 1024px):** dense 12-column pages with a 24px gutter and 16px gaps. Record pages for accounts, opportunities, and proposals each have their own URL; drawers are only for quick views.
- **Mobile/tablet (< 1024px):** the AppShell drawer for navigation, a sticky bottom action bar on record pages, horizontal scroll for tables.
- Must work from 375px to 1920px wide with no horizontal page scroll.

## 4. Meta Astryx is mandatory for UI primitives

- Before building or editing any UI component, run inside `./singtech`:
  - `pnpm exec astryx component --list` (catalogue saved in `singtech/docs/astryx-components.md`)
  - `pnpm exec astryx component <Name> --props` for every primitive you plan to use.
  - Do not use `pnpm run astryx -- ...`: pnpm 12 forwards the `--`, so the CLI misreads flags as component names.
- Astryx is pinned to 0.7.15: pnpm's 24h minimum-release-age policy rejects newer releases until they age. Do not bypass the policy.
- Astryx ships prebuilt CSS. No StyleX compiler is configured, so never `astryx swizzle` and never call `stylex.create()` in app code. Restyle through theme tokens, slot props, and `@layer singtech-theme` CSS.
- Prefer an Astryx primitive over a hand-rolled one. Hand-roll only when Astryx has no equivalent (charts, kanban, KPI strip), and say so in one line in the turn summary.

## 5. Data integrity rules

- Every claim shown about a company must render a clickable source link. No claim without a source; when there is none, show "No signal found".
- `sourceUrl` must be a real URL that someone opened. Live signals keep the URL of the article they came from.
- Existing-customer accounts are fictional and are marked "Sample account". Real companies appear only as prospects and must never be shown as existing Singtel customers or partners.
- Never present invented facts (headcounts, hiring numbers, deal values) as reported by a named publication. Pricing is "indicative, derived from catalogue ARR", never Singtel list pricing.

## 6. Security and privacy rules

- All text bound for any external service (an LLM, Slack, Salesforce) passes through `sanitizeEnterprisePayload()` in `src/lib/pii-redactor.ts` first. No exceptions. Server-side only.
- Every redaction produces a `PiiAuditRecord`, returned by the API routes.
- Secrets only in `singtech/.env.local` (gitignored). Ship `.env.example` with empty values. Never log, echo, or render a secret; status pages show only "configured" or "not configured".
- API keys are read only in server code, never in client components or `NEXT_PUBLIC_*` vars.
- Validate every API route body (type, length, allowed fields) before use. Webhook and CRM URLs come from env only, never from request input.
- Fetching a user-supplied website requires: https only, public IPs only (resolve DNS, reject private ranges), same-host redirects (max 2), a 5s timeout, a 500KB cap, and text/html only.
- Every external call has a timeout and a deterministic local fallback, so the demo never errors on stage.

## 7. Engineering rules

- TypeScript strict. Shared types live in `src/types/singtech.ts` as zod schemas; seed JSON must type-check against them.
- Leaflet via `next/dynamic` with `ssr: false`.
- `cacheComponents` is on: call `new Date()`, `Date.now()`, `crypto.randomUUID()`, and `Math.random()` only in client components, API route handlers, or behind `<Suspense>` / `connection()`, never during server prerender.
- Seed data lives in `src/data/*.json`. Add a signal only with a source URL you have opened. Keep `priorityScore` and bundle ARR equal to their sums (tests enforce this).
- LLM provider is not yet chosen: every AI feature must work from rules alone, with the LLM as an optional enhancer behind one server-side module. The existing Claude path (`src/lib/claude.ts`, model `claude-opus-5-5`):
  - read the text via `content.find(b => b.type === "text")`;
  - never send `temperature`, `top_p`, `top_k`, or `budget_tokens`;
  - check `stop_reason === "refusal"`;
  - fall back on any error.
- Dev and build must run clean. If Turbopack conflicts with `@astryxdesign/build` / StyleX, use `next dev --webpack` and `next build --webpack`.
- Tests (Vitest) for redaction, scoring, data derivation, money maths, and every parser or matcher.
- Done means: `pnpm run build`, `pnpm run typecheck`, `pnpm run lint`, and `pnpm test` all pass with zero errors, plus the section 1 grep is clean.

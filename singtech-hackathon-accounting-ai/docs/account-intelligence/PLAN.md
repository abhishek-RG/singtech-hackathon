# Account Intelligence (Farming): implementation plan

Owner: Account Intelligence module (existing enterprise and MNC customers only).
Source of truth: "SingTech Account Intelligence (Farming) - Report and Implementation Plan"
(Nov 16, 2026) and the Singtel Emerging Technologies problem statement.
Status: approved on 2026-11-16 ("go"). Build steps run one at a time, one commit each.

## 0. Decisions taken (2026-11-16)

| Topic            | Decision                                                                                                                                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base branch      | `accounting-ai` is based on the scaffold commit `9635a06 chore: base scaffold`, the same base as the teammates' branches. `main` holds only a static coming soon page and is not the base.                                                                                                      |
| Branch name      | `accounting-ai` (the misspelled `accouting-ai` was replaced).                                                                                                                                                                                                                                   |
| Product name     | "SingTech AI" everywhere, including the shared scaffold files (renamed repo-wide on 2026-11-16: package scope `@singtech/*`, service `singtech-api`). `APP_NAME` is "SingTech AI".                                                                                                              |
| The six products | 5G+, Singtel CUBΣ, Cyber Security, Internet of Things, Mobility, Quantum-Safe Network.                                                                                                                                                                                                          |
| Currency         | Every money row stores `amount` in local `currency` plus `amount_sgd`. The UI displays SGD.                                                                                                                                                                                                     |
| Tests            | Root `test` script runs the built-in `node --test`.                                                                                                                                                                                                                                             |
| Deal desk        | No route yet. Button disabled with the tooltip "Opens in Deal desk".                                                                                                                                                                                                                            |
| Auth and RLS     | User JWTs with RLS as the real guard. Supabase automatic RLS is on and automatic table exposure is off, so every migration includes explicit `grant` statements for the tables the API reads. The service-role key is used only for server-side seeding, never in the web app and never in git. |
| Health rules     | Bands 70 / 40, change window 180 days, all in `rules/config.json`.                                                                                                                                                                                                                              |
| Today            | `DEMO_TODAY=2026-11-16` in env for the demo; the real clock when it is not set.                                                                                                                                                                                                                 |

## 1. What the repo gives us (scaffold stack)

| Item              | Where                                                                                                 | Reuse                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack             | npm workspaces, JavaScript ESM, Node 20.19+, React 19 + Vite 7 + React Router 7, Express 5, plain CSS | Everything. No TypeScript, no CSS frameworks.                                                                                                                                                                             |
| Conventions       | `CLAUDE.md` on the scaffold                                                                           | Pages in `apps/web/src/pages/`, features in `features/<name>/`, server module = `<name>.routes.js` (thin) + `<name>.service.js` (logic).                                                                                  |
| Design tokens     | `apps/web/src/styles/tokens.css`                                                                      | `--accent` (Singtel red), `--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--success`, `--danger`, `--space-*`, `--radius-*`, `--shadow-*`. Light and dark via `prefers-color-scheme` and `<html data-theme>`. |
| Layout            | `global.css`                                                                                          | `.container`, `.card`, `.card__header`, `.card__title`, `.card__hint`, `.text-muted`, `.page-center`.                                                                                                                     |
| Shared components | `components/`                                                                                         | `Navbar` (has `NAV_LINKS`), `Button` (`to`/`href`/button, variants), `StatusBadge` (`ok`/`error`/`loading`/`idle`).                                                                                                       |
| API helper        | `apps/web/src/lib/api.js`                                                                             | `api.get/post/...` returning `{ ok, data }`, throws `ApiError`. The only place allowed to call `fetch`.                                                                                                                   |
| Server shape      | `apps/server/src/app.js`, `middleware/errorHandler.js`                                                | Mount one router line in `app.js`; `HttpError(status, code, message)`; `{ ok: true, data }` responses.                                                                                                                    |
| Shared constants  | `packages/shared/src/index.js`                                                                        | `API_PREFIX`, `APP_NAME`. Add our product catalog and health bands here so web and server agree.                                                                                                                          |
| Env               | root `.env.example`, `process.loadEnvFile` in `server/src/index.js`                                   | Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` placeholders.                                                                                                                                                                  |
| Theme             | `lib/theme.js`                                                                                        | Nothing to add; our CSS uses tokens only.                                                                                                                                                                                 |
| Formatting        | `.prettierrc` (single quotes, semi, width 100)                                                        | Run `npm run format` on our files.                                                                                                                                                                                        |

There is no accounts model, product catalog or test runner on the scaffold yet. The
`metrics` branch's `features/lead-scoring/leadsData.js` is a prospecting dataset (hunting),
not reusable for existing customers, but its page and CSS structure (`lead-page`,
`lead-header`, `lead-summary`, `lead-toolbar`, `details-hero`) is the visual pattern to match.

### Existing routes and pages (must not touch)

| Branch   | Route                                                                     | Page                                                                       | Owner                     |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| scaffold | `/`                                                                       | `pages/Landing.jsx`                                                        | shared                    |
| scaffold | `*`                                                                       | `pages/NotFound.jsx`                                                       | shared                    |
| metrics  | `/leads`, `/leads/:companyId`                                             | `LeadScoringDashboard.jsx`, `CompanyDetails.jsx`, `features/lead-scoring/` | teammate (prospecting)    |
| manan    | separate Next.js app under `singtech/`, RAG gateway under `singtech-rag/` |                                                                            | teammate (deal desk, RAG) |

### Do not touch

- `apps/web/src/pages/Landing.jsx`, `Landing.css`, `NotFound.jsx`, `App.jsx`, `main.jsx`.
- `apps/web/src/components/*` (shared). If we need a new reusable component we add a new file;
  we do not edit `Navbar.css`, `Button.*`, `StatusBadge.*`.
- `apps/web/src/styles/tokens.css` and `global.css` (no new tokens; we compose existing ones).
- `apps/web/src/lib/api.js`, `theme.js`.
- `apps/server/src/routes/health.js`, `middleware/errorHandler.js`, `index.js`.
- Anything under `features/lead-scoring/`, `pages/LeadScoringDashboard.jsx`,
  `pages/CompanyDetails.jsx`, and everything on the `manan` branch.
- `package.json` dependencies (ask first), `.prettierrc`, `.editorconfig`.

Shared files we edit, one line each, and nothing else in them:

- `apps/web/src/routes.jsx`: two route lines.
- `apps/web/src/components/Navbar.jsx`: one `NAV_LINKS` entry (`/accounts`, "Accounts").
- `apps/server/src/app.js`: one `app.use(...)` line.
- `packages/shared/src/index.js`: append exports (no edits to existing ones).
- `.env.example`: append the Supabase block.
- `package.json` (root): add a `test` script (`node --test apps/server`).

## 2. Where the module plugs in

```
Navbar:  Home | Lead Scoring | Accounts            <- one new NAV_LINKS entry
Routes:  /accounts              Account book
         /accounts/:accountId   Account page (360)
API:     /api/account-intelligence/...             <- one router mounted in app.js
```

Integration points:

- Web page files in `pages/` are thin: they render the feature entry components.
- The feature calls `api.get('/account-intelligence/...')` through `lib/api.js` only.
- Server routes call `account-intelligence.service.js`, which calls the data access layer
  (section 5). All scoring, tenure and change detection runs in the service on the server, so
  the web app never computes a health score and the Supabase adapter swap is invisible to the UI.
- Shared constants (product catalog, health bands, action types) live in `packages/shared` so
  the UI labels and server rules cannot drift.
- Deal desk hand-off (teammate): the next best action card has a disabled "Open in Deal desk"
  button with the tooltip "Opens in Deal desk" until the teammate exposes a route. We never
  import their code.
- AI agent panel: an empty, labelled slot on the Account page (`AgentPanel.jsx`) that renders
  "Ask SingTech: coming in Phase 2" and nothing else. It is reserved so the layout does not shift
  later.

## 3. File tree (every file we add)

```
docs/account-intelligence/
  PLAN.md                                   this plan
  DATA-MODEL.md                             table-by-table reference (written in step 2)

.env.example                                append SUPABASE_URL, SUPABASE_ANON_KEY (empty), DEMO_TODAY

packages/shared/src/
  account-intelligence.js                   PRODUCTS (six), HEALTH_BANDS, ACTION_TYPES, MARKETS, INDUSTRIES
  index.js                                  (edit) re-export the file above

apps/server/src/modules/account-intelligence/
  account-intelligence.routes.js            Express Router, thin handlers
  account-intelligence.service.js           orchestrates: load account bundle, compute, respond
  data/
    schema.js                               column lists, allowed values and references per table (validates seed rows)
    adapter.js                              interface description + getAdapter() (env switch)
    mock.adapter.js                         MockAdapter: reads seed JSON, in-memory filters
    supabase.adapter.js                     SupabaseAdapter: same methods over Supabase REST (PostgREST), fetch only
    seed/
      generate.js                           deterministic generator for every seed file (stories inline; step 8 adds the other 30)
      accounts.json                         about 40 accounts with parent_id hierarchy
      sites.json
      contacts.json
      assets.json                           installed services, start/end, status, monthly value
      contracts.json
      cases.json
      activities.json
      bills.json                            monthly bill rows, read-only signal
      opportunities.json
      stories.json                          the 5 at-risk and 5 healthy scripted stories, with expected outputs
  rules/
    config.json                             signal weights, thresholds, band cut-offs, per-industry overrides
    tenure.js                               years per service, overall tenure, contract runway
    changes.js                              change detection (adds, downgrades, removals, spend trend, sites, contacts, complaints)
    health.js                               0-100 score with reasons[] each carrying evidence ids
    whitespace.js                           products lacked vs signals ("what is missing")
    next-action.js                          decision tree (4 questions to 6 actions), config-driven
    revenue-at-stake.js                     annual recurring revenue x band weight, used for sorting
    index.js                                analyseAccount(): loads config, applies industry overrides, runs every rule
  account-intelligence.test.js              node:test tests: seed shape, adapter, rules on the 10 stories, API

supabase/
  migrations/0001_account_intelligence.sql  tables, indexes, RLS policies (not applied until keys exist)
  seed/README.md                            how to load the same JSON into Supabase (step 11)

apps/web/src/pages/
  AccountBook.jsx                           renders <AccountBook />
  AccountPage.jsx                           renders <AccountDetail />

apps/web/src/features/account-intelligence/
  api.js                                    getMeta(), getAccountBook(), getAccount(id), getEvidence() via lib/api.js
  format.js                                 SGD, dates, tenure "4 y 3 m", labels, evidence index
  storage.js                                remembered filters, sort and tab (localStorage, guarded)
  csv.js                                    CSV export, Excel-safe (UTF-8 BOM, formula guard)
  AccountIntelligence.css                   all styles for the feature, tokens only
  AccountBook.jsx                           list view: saved views, filters, sortable table, CSV, keyboard
  AccountDetail.jsx                         record page: highlights, decision path, tabs, related lists
  components/
    SimulatedDataBanner.jsx                 the visible "Simulated data" label (both pages)
    HealthBadge.jsx                         band pill (Healthy / Watch / At risk) with score
    Toast.jsx                               toast for confirmed actions (CSV export, copy)
    InsightCards.jsx                        Health and why, What changed, What is missing, Next best action,
                                            Ask SingTech slot, Account hierarchy
    RelatedTable.jsx                        related lists (Services, Contracts, Cases, Activities,
                                            Opportunities, Stakeholders), cards on phones
    Evidence.jsx                            evidence chips and the source record dialog
```

Files we edit (one line each): `routes.jsx`, `Navbar.jsx`, `app.js`, `packages/shared/src/index.js`,
`.env.example`, root `package.json` (test script).

## 4. Data model (Supabase tables)

All tables carry `id uuid primary key default gen_random_uuid()`, `created_at timestamptz
default now()`, `updated_at timestamptz`. Money columns come in pairs: `amount numeric(12,2)`
in the row's `currency` (ISO code) plus `amount_sgd numeric(12,2)`; the same pairing applies to
`monthly_value` and `total_value`. The UI displays the SGD column. Foreign keys are `on delete
restrict`. Enumerations are `text` with a `check`
constraint so the mock JSON and SQL stay identical.

| Table           | Key columns                                                                                                                                                                                                                                                                                                                                                           | Notes                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`      | `id`, `parent_id -> accounts` (null = group parent), `name`, `account_type` (`business`, `billing`, `service`), `segment` (`enterprise`, `mnc`), `industry`, `country` (ISO-2), `market` (`SG`, `AU`, `IN`, `ID`, `TH`, `PH`, `HK`, `JP`, `US`, `GB`), `employee_band`, `owner_name`, `owner_email`, `is_customer bool`, `customer_since date`, `annual_revenue_band` | Hierarchy = self reference. One business account per legal entity; billing and service accounts hang off it like Communications Cloud.                          |
| `sites`         | `id`, `account_id`, `name`, `site_type` (`hq`, `office`, `plant`, `data_centre`, `warehouse`), `country`, `city`, `on_net bool`, `opened_on`, `closed_on`                                                                                                                                                                                                             | New sites are an expansion signal.                                                                                                                              |
| `contacts`      | `id`, `account_id`, `full_name`, `title`, `email_masked`, `role` (`decision_maker`, `influencer`, `technical_buyer`, `champion`, `procurement`), `left_company bool`, `left_on`, `last_contacted_on`                                                                                                                                                                  | Champion leaving is a risk signal. PII masked at rest in mock data (`j***@example.com`).                                                                        |
| `assets`        | `id`, `account_id`, `site_id`, `product_code` (one of six), `product_name`, `status` (`active`, `downgraded`, `cancelled`, `pending`), `start_date`, `end_date`, `monthly_value`, `currency`, `quantity`, `previous_monthly_value`, `changed_on`, `change_type` (`added`, `upgraded`, `downgraded`, `removed`, null)                                                  | Installed Singtel services. Tenure per service = today minus `start_date`.                                                                                      |
| `contracts`     | `id`, `account_id`, `contract_number`, `start_date`, `end_date`, `term_months`, `total_value`, `auto_renew bool`, `status` (`active`, `expiring`, `expired`, `renewed`), `product_codes text[]`                                                                                                                                                                       | Renewal window = `end_date` within N days (config).                                                                                                             |
| `cases`         | `id`, `account_id`, `site_id`, `case_number`, `opened_on`, `closed_on`, `severity` (`low`, `medium`, `high`, `critical`), `category` (`outage`, `performance`, `billing_query`, `service_request`, `complaint`), `subject`, `description`, `mentions_competitor bool`, `competitor_alias` (`Competitor A/B/C` or null), `csat` (1-5 or null)                          | Complaint volume, severity and competitor mentions feed health. Billing queries are a signal only.                                                              |
| `activities`    | `id`, `account_id`, `contact_id`, `activity_type` (`meeting`, `call`, `email`, `qbr`), `occurred_on`, `subject`, `outcome`, `notes`                                                                                                                                                                                                                                   | Relationship health = days since last meeting.                                                                                                                  |
| `bills`         | `id`, `billing_account_id -> accounts`, `bill_number`, `period_start`, `period_end`, `amount`, `currency`, `status` (`paid`, `due`, `overdue`, `disputed`), `product_lines jsonb`                                                                                                                                                                                     | Read-only. Spend trend = last 3 months vs prior 3. Never edited by the app.                                                                                     |
| `opportunities` | `id`, `account_id`, `name`, `opportunity_type` (`renewal`, `upsell`, `cross_sell`, `executive_meeting`), `stage` (`identified`, `meeting`, `proposal`, `won`, `lost`), `amount`, `product_codes text[]`, `created_on`, `closed_on`, `source` (`account_intelligence`, `manual`), `lost_reason`                                                                        | Phase 3 outcome tracker reads this. Phase 1 only displays it.                                                                                                   |
| `health_scores` | `id`, `account_id`, `computed_at`, `score int 0-100`, `band` (`healthy`, `watch`, `at_risk`), `reasons jsonb` = `[{ code, label, points, evidence_ids: [] }]`, `revenue_at_stake`, `rules_version`                                                                                                                                                                    | One row per computation. Latest row per account is the one shown. Evidence ids point at `cases`, `assets`, `contracts`, `contacts`, `bills`, `activities` rows. |
| `audit_log`     | `id`, `actor_email`, `action` (`view_account`, `compute_health`, `create_opportunity`, `ask_agent`), `account_id`, `details jsonb`, `occurred_at`                                                                                                                                                                                                                     | Written by the server, never by the client.                                                                                                                     |

Indexes: every `account_id` and `parent_id`; `assets(account_id, status)`; `cases(account_id,
opened_on)`; `bills(billing_account_id, period_start)`; `health_scores(account_id, computed_at
desc)`.

A view `v_account_book` joins the latest `health_scores` row per account with summed active
`assets.monthly_value` and the nearest `contracts.end_date`, so the Account book is one query.

### RLS rules

- RLS on for every table and is the real guard: the server forwards the user's JWT with the
  anon key. In Phase 1 (mock) the policies are written but not exercised.
- Supabase automatic table exposure is off, so the migration grants explicitly:
  `grant usage on schema public to authenticated;` and `grant select on <table> to
authenticated` for every table the API reads; `grant insert, update on opportunities to
authenticated` for Phase 3. Nothing is granted to `anon`.
- The service-role key is used only by the seeding script on the server side. It never appears
  in the web app, in `.env.example` values, or in git.
- `accounts`, `sites`, `contacts`, `assets`, `contracts`, `cases`, `activities`, `bills`,
  `opportunities`, `health_scores`: `select` allowed when `auth.jwt() ->> 'email'` equals the
  account's `owner_email`, or the user has role `sales_manager` (claim `app_role`) for that
  account's `market`. Hierarchy: a user who owns the parent may read its children (policy uses a
  recursive helper function `account_tree(uuid)`, `security definer`).
- `bills`: `select` only. No `insert`, `update` or `delete` policy for any role (billing is
  read-only by design).
- `health_scores` and `audit_log`: `insert` only by the `service_role`; `select` on
  `audit_log` limited to `app_role = 'admin'`.
- `opportunities`: `insert` and `update` for the account owner (Phase 3 write-back); `delete`
  never.
- `contacts.email_masked` is the only email column; raw emails are never stored.

## 5. Data access layer

One interface, two adapters, env-only switching.

```
getAdapter():  SUPABASE_URL and SUPABASE_ANON_KEY present  -> SupabaseAdapter
               otherwise                                   -> MockAdapter
```

Interface (every method returns plain objects shaped exactly like the table rows above):

```
listAccounts({ market, segment, industry })      -> accounts[] (business accounts only)
getAccount(id)                                   -> account | null
getAccountTree(id)                               -> { parent, children[] }
getSites(accountId)                              -> sites[]
getContacts(accountId)                           -> contacts[]
getAssets(accountId, { includeHistory })         -> assets[]
getContracts(accountId)                          -> contracts[]
getCases(accountId, { since })                   -> cases[]
getActivities(accountId, { since })              -> activities[]
getBills(accountId, { months })                  -> bills[]
getOpportunities(accountId)                      -> opportunities[]
findRecord(id)                                   -> { table, row } | null   (resolves evidence links)
saveHealthScore(row)                             -> row           (mock: latest per account, in memory)
writeAudit(row)                                  -> void          (mock: last 500 rows, in memory)
```

- `MockAdapter` reads the seed JSON once at start and answers from memory. `today` comes from
  `DEMO_TODAY` when set (demo: `2026-11-16`) and from the real clock otherwise; tests pass a
  fixed date explicitly.
- `SupabaseAdapter` uses `fetch` against the PostgREST endpoint (`${SUPABASE_URL}/rest/v1/...`)
  with `apikey` and `Authorization` headers. No npm dependency needed; if we later want the
  official client we ask first (rule: ask before adding a dependency).
- The service never knows which adapter it has. The `/api/account-intelligence/meta` endpoint
  reports `{ source: 'mock' | 'supabase' }`, which the banner shows ("Simulated data" when mock).

### API endpoints

| Method | Path                                                          | Returns                                                                                                                                                                  |
| ------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/account-intelligence/meta`                              | `{ source, rulesVersion, today }`                                                                                                                                        |
| GET    | `/api/account-intelligence/accounts?market=&segment=&band=`   | account book rows: account, health, band, revenue at stake, products owned (n/6), contract runway, next action type                                                      |
| GET    | `/api/account-intelligence/accounts/:id`                      | the full 360 bundle: account, tree, sites, contacts, assets, contracts, cases, activities, bills summary, opportunities, tenure, changes, health, whitespace, nextAction |
| GET    | `/api/account-intelligence/accounts/:id/evidence/:evidenceId` | the one source row an evidence id points to (for the EvidenceLink popover)                                                                                               |

Phase 1 is read-only. No POST routes until Phase 3.

## 6. Mock data spec

- 40 fictional accounts, Communications Cloud shaped: 12 MNC groups (each a parent with 2 to 4
  country subsidiaries, so about 36 child rows) plus 4 large single-country enterprises. Business
  account rows only in `accounts.json`; billing and service accounts are modelled as rows with
  `account_type` so the hierarchy looks real but the UI lists business accounts.
- Markets: Singapore (majority), Australia, India, Indonesia, Thailand, Philippines, Hong Kong,
  Japan, USA, UK. Industries: financial services, manufacturing, logistics, healthcare, retail,
  technology, energy. Enterprise and MNC only; no consumer, no SME.
- Product catalog (`PRODUCTS`): exactly six, in `packages/shared`, each with code, name and a
  one-line positioning: `5G_PLUS` 5G+, `CUBE` Singtel CUBΣ, `CYBER` Cyber Security, `IOT`
  Internet of Things, `MOBILITY` Mobility, `QSN` Quantum-Safe Network.
- Per account: 1 to 5 active assets, 1 to 3 contracts, 2 to 6 sites, 3 to 6 contacts, 0 to 12
  cases, 3 to 10 activities, 12 months of bills per billing account, 0 to 2 opportunities.
- Competitors inside customer text are only "Competitor A", "Competitor B", "Competitor C".
- Names of companies and people are fictional and checked not to match real firms.
- 5 scripted at-risk stories, each in `stories.json` with the expected band, top reason, gap and
  next action, so tests assert the rules reproduce the story:
  1. Service issues: 4 high-severity outage cases in 90 days, CSAT 2, a competitor mentioned in
     a case. Expected: At risk, reason "service issues", action "executive meeting plus service
     recovery plan".
  2. Price perception: contract ends in 60 days, two cases mentioning "cheaper offer from
     Competitor B", spend flat. Expected: At risk, reason "price perception", action "renewal with
     value case (bundle), no discount".
  3. Champion left: decision maker `left_company`, no meeting in 120 days, downgraded one asset.
     Expected: Watch or At risk, reason "relationship", action "re-map stakeholders, executive
     meeting".
  4. Partial move: one asset `removed`, bill amount down 35% over 3 months, RFP mentioned.
     Expected: At risk, reason "partial move", action "renewal defence with missing product".
  5. Coverage gap: subsidiary opened two sites in a market with `on_net = false`, case category
     performance. Expected: Watch, reason "coverage gap", action "cross-sell (network expansion)".
- 5 healthy look-alikes: same industry and size as the five above, but healthy signals (QBR in
  last 60 days, spend up, no severe cases). Expected: Healthy, and the tree routes them to growth
  (upsell or cross-sell of a lacked product). This proves the tree creates opportunities, not
  just saves.
- Remaining 30 accounts are generated by a deterministic script (seeded random, committed output)
  so the book has variety without hand-writing every row.

### Rules, in code (no AI)

- Tenure: per asset `start_date` to today; account tenure = earliest active asset or
  `customer_since`. Shown as "4 y 3 m".
- Change detection (window 180 days, config): asset `change_type` events, bill spend trend (last
  3 months vs previous 3, threshold 15%), new or closed sites, contacts `left_company`, case
  count and severity rising vs the previous window.
- Health score: start at 100, subtract weighted penalties from `rules/config.json` (severe cases,
  complaint trend, competitor mention, spend decline, downgrade or removal, champion left, no
  meeting in N days, contract ending with no renewal opportunity), add small credits (recent QBR,
  spend growth, new sites). Clamp 0 to 100. Bands: Healthy 70 and above, Watch 40 to 69, At risk
  under 40. Every penalty records `evidence_ids`.
- Revenue at stake: annual recurring revenue (active `monthly_value_sgd` x 12) multiplied by a
  band weight (At risk 1.0, Watch 0.5, Healthy 0.1). The Account book sorts by this. Changed on
  2026-11-16 from the first draft (monthly value x months of runway), which ranked a renewal due
  next month below one due next year: the opposite of what a seller needs.
- Whitespace: six products minus owned; each lacked product is matched to a signal (for example
  security cases match Cyber Security; new sites or performance cases match Singtel CUBΣ; new
  plants or warehouses match Internet of Things; financial services match Quantum-Safe Network)
  so "what is missing" has a reason, not a list.
- Next best action: decision tree with four questions (at risk? renewal within window? missing
  product with matching signal? relationship stale?) ending in exactly one of six actions:
  executive meeting, renewal with value case, cross-sell, upsell, stakeholder re-map, service
  recovery plan. Never a discount-only action. Lives in `config.json` per industry.

## 7. Screens

### Account book (`/accounts`)

- Header: title, "Simulated data" banner, summary tiles (accounts, at risk, revenue at stake,
  average products owned out of six).
- Filters: market, segment, band. Sort default: revenue at stake descending.
- Rows: name (link), parent group, country, industry, band pill with score, products owned
  (n/6), tenure, contract runway, revenue at stake, next action type. Responsive: table on
  desktop, stacked cards at 375 px (no horizontal scroll).

### Account page (`/accounts/:accountId`)

Card order top to bottom, two columns on desktop, one at 375 px:

1. Account header (who): name, group and hierarchy tree, country, industry, owner, tenure, band.
2. Services and tenure (what, since when): table of assets with site and monthly value;
   contracts card with runway and renewal window.
3. What changed: timeline, newest first, each item links to its evidence.
4. Health and why: score, band, reason list with points and evidence links.
5. What is missing: lacked products with the matching signal; competitor note ("Competitor B
   mentioned in case C-0412").
6. Next best action: one action, talking points, draft message placeholder (static text in
   Phase 1, AI drafted in Phase 2), disabled "Open in Deal desk" button, tooltip "Opens in Deal
   desk".
7. Stakeholders: contacts with roles and the left-company flag.
8. Agent panel slot: empty card titled "Ask SingTech", body "Coming in Phase 2".

Every number on both screens is computed by the server rules; the UI formats only.

## 8. Build steps (each small, each with an acceptance check)

| #   | Step                                                                                                                                            | Acceptance check                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Base `accounting-ai` on the scaffold. `npm install`, `npm run build`, start the API and check `/api/health`. Record the decisions in this plan. | Build passes, API answers, no module file yet.                                                                                                                                                 |
| 2   | Add `packages/shared/src/account-intelligence.js` (products, bands, actions) and `DATA-MODEL.md`. Append `.env.example` block.                  | `npm run build` passes; importing `@singtech/shared` lists six products.                                                                                                                       |
| 3   | Seed JSON for the 10 scripted stories only (5 at-risk, 5 healthy) plus `stories.json`.                                                          | JSON validates against the column lists in section 4 (small check in the test file).                                                                                                           |
| 4   | `MockAdapter` plus `adapter.js` with the env switch.                                                                                            | Unit test: `getAdapter()` returns Mock when env is empty; `listAccounts()` returns 10.                                                                                                         |
| 5   | Rules: `tenure.js`, `changes.js`, `health.js`, `revenue-at-stake.js`.                                                                           | `node --test` passes: each scripted story gets its expected band and top reason.                                                                                                               |
| 6   | Rules: `whitespace.js`, `next-action.js` with `config.json`.                                                                                    | Tests: each story gets its expected gap and action; no action is discount-only.                                                                                                                |
| 7   | Service plus routes mounted in `app.js`.                                                                                                        | `curl /api/account-intelligence/accounts` returns 10 rows sorted by revenue at stake; `/accounts/:id` returns the full bundle; unknown id gives `{ ok: false, error: { code: 'NOT_FOUND' } }`. |
| 8   | Generate the remaining 30 accounts (seeded script, output committed).                                                                           | Book shows 40 accounts; the 10 stories keep their expected bands (tests still pass).                                                                                                           |
| 9   | Web: `api.js`, `format.js`, `AccountBook.jsx`, page and route, nav link, banner.                                                                | `/accounts` renders 40 rows, sorted, filters work, 375 px has no horizontal scroll, light and dark both read correctly.                                                                        |
| 10  | Web: `AccountDetail.jsx` and cards 1 to 7, `AgentPanel` slot.                                                                                   | For each of the 5 at-risk stories the page shows the expected reason, gap and action; evidence links resolve; 375 px and dark mode pass.                                                       |
| 11  | `supabase/migrations/0001_...sql` with RLS, `SupabaseAdapter` (fetch only, untested until keys).                                                | SQL parses (Supabase CLI or psql if available); adapter has the same method list as Mock (a test asserts identical method names).                                                              |
| 12  | Run everything: `npm run build`, `npm run format`, `npm test`. Final review of the diff. Do not push.                                           | Build green; no file outside the list in section 3 is in the diff except the one-line edits.                                                                                                   |

Each step ends with its acceptance check, the existing tests and build, and one commit
"feat(account-intelligence): step N - <summary>", then a stop until "next". Step 11 can slide
to when keys arrive. Phase 2 (agent panel, switching analysis with AI, draft message) and
Phase 3 (write-back, outcome tracker, competitor panel) are out of this plan's build steps on
purpose.

## 9. Risks

| Risk                                                             | Mitigation                                                                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch base differs from `main` (main has no scaffold)           | Decided: based on `9635a06`. The PR target is agreed with the team before opening it.                                                                                  |
| Port clash: another local session may hold 8787 or 3000          | Web dev server is on 3000 (`vite.config.js`), API on 8787. Run with `PORT=8788` and `vite --port 3001` while that session is alive; both are env or flag only.         |
| Scope drift into billing operations                              | Bills are read-only rows and a spend trend; no edit route exists.                                                                                                      |
| Save plays reading as discounts                                  | The six actions contain no discount action; "price perception" routes to "renewal with value case".                                                                    |
| Judges see mock data as circular                                 | `stories.json` records the expected outcome next to the inputs, and the tests prove the rules reproduce it; weights live in `config.json` for the mentor to challenge. |
| Teammate merge conflicts in `routes.jsx`, `Navbar.jsx`, `app.js` | One line each, appended at the end of the list, so merges are trivial.                                                                                                 |
| No test runner on the scaffold                                   | `node --test` is built in; a root `test` script is a one-line addition.                                                                                                |
| Supabase adapter untested until keys arrive                      | Method-parity test keeps the shape honest; the real test is a short task once keys exist.                                                                              |
| PII in mock data                                                 | Only masked emails, fictional names, no phone numbers.                                                                                                                 |

## 10. Open questions

All ten planning questions were answered on 2026-11-16; the answers are in section 0. Still
open, to be raised when they become relevant:

- The Deal desk route for "create proposal for account X with products Y" (teammate).
- Which branch the team will use as the PR target, given that `main` currently holds the
  coming soon page rather than the scaffold.
- Supabase URL and anon key (and the service-role key for seeding, shared outside git).

## 11. Visual system, workspace, product site and demo sign-in (2026-11-16)

Added after steps 1 to 7, 9 and 10. Step 8 (the other 30 accounts) and step 11 (Supabase) are
still open.

- **Visual system:** `features/account-intelligence/theme.css` is the only file with colour
  values. It is scoped to `.st-root`, so teammates' pages keep the shared look, and it remaps
  the shared token names inside that scope. Light and dark follow the existing theme switch.
  Checked contrast: body, muted, status pills and button text all meet WCAG AA in both themes.
- **Routes** (`routes.jsx`, the one shared file changed for this): `/` product site,
  `/sign-in` demo sign-in, then a signed-in workspace shell for `/accounts`,
  `/accounts/:accountId` and `/assistant`. The scaffold welcome page moved to `/dev`.
- **Demo sign-in:** see `DEMO-LOGIN.md`. Two dummy users (admin sees 10 accounts, account
  manager sees her 4). Every Account Intelligence API route except `/auth/*` needs a session.
- **Ask SingTech AI:** a rules-based preview. `POST /api/account-intelligence/assistant`
  answers five intents (summary, why at risk, renewal plan, what is missing, next action) from
  the same rules, cites records and ends with the next action. No model is called; the Phase 2
  agent replaces the wording, not the facts.

```
apps/server/src/modules/account-intelligence/
  auth/auth.service.js           scrypt hashes, signed session tokens, visibility rule
  auth/auth.routes.js            /auth/login, /logout, /me, /demo-accounts; requireSession
  assistant.service.js           intent detection, account matching, sourced answers
  data/seed/demo-users.json      two dummy users, hashes only
  auth-and-assistant.test.js     sign-in, throttling, visibility, assistant answers

apps/web/src/features/account-intelligence/
  theme.css                      the visual system tokens
  components/Icon.jsx            outline icon set and the SingTech AI mark (no icon library)
  shell/WorkspaceShell.jsx       sidebar, top bar, theme toggle, rail and drawer
  shell/session.jsx              session guard and sign-out
  shell/shell.css
  auth/SignIn.jsx, auth.css      demo sign-in page
  assistant/Assistant.jsx        history column, account selector, empty state, thread, composer
  assistant/assistant.css
  landing/Landing.jsx            product site, ten sections
  landing/ProductPreview.jsx     static screenshot-style previews (simulated data)
  landing/landing.css

apps/web/src/pages/
  LandingPage.jsx, SignInPage.jsx, AssistantPage.jsx, WorkspaceLayout.jsx
```

Pattern sources (structure only, rebuilt with our CSS): shadcn-ui/ui sidebar-07 and
dashboard-01 blocks (MIT), vercel/chatbot `components/chat/*` (licence not detected, no code
copied), assistant-ui docs demo elements (MIT), magicui `bento-grid.tsx` and `blur-fade.tsx`
(MIT). Each file that follows one names it in a comment.

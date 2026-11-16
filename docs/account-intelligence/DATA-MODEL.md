# Account Intelligence: data model

Reference for the Supabase tables behind the SingTech AI Account Intelligence module. The
mock seed JSON under `apps/server/src/modules/account-intelligence/data/seed/` uses exactly
these column names, so the MockAdapter and the SupabaseAdapter return identical rows.

## Conventions

- Every table has `id uuid primary key default gen_random_uuid()`, `created_at timestamptz
not null default now()` and `updated_at timestamptz`.
- Money comes in pairs: the local amount in the row's `currency` (ISO 4217) and the same
  amount in SGD. The UI displays the SGD column only.
  - `bills.amount` and `bills.amount_sgd`
  - `assets.monthly_value` and `assets.monthly_value_sgd`
  - `contracts.total_value` and `contracts.total_value_sgd`
  - `opportunities.amount` and `opportunities.amount_sgd`
- Enumerations are `text` columns with a `check` constraint. The allowed values are listed
  per table below and mirrored in `packages/shared/src/account-intelligence.js` where the UI
  needs labels.
- Dates that are calendar days (`start_date`, `opened_on`, ...) are `date`. Points in time
  (`computed_at`, `occurred_at`) are `timestamptz`.
- Foreign keys are `on delete restrict`. Nothing in the module deletes rows.
- Personal data: `contacts` stores a masked email only (`j***@example.com`) and no phone
  numbers. Mock people and companies are fictional.

## Tables

### accounts

The customer hierarchy. One row per legal entity; subsidiaries point at their group parent.

| Column                      | Type                        | Notes                                                                                        |
| --------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `parent_id`                 | uuid, nullable, FK accounts | Null for a group parent.                                                                     |
| `name`                      | text                        |                                                                                              |
| `account_type`              | text                        | `business`, `billing`, `service` (Communications Cloud shape). The UI lists `business` rows. |
| `segment`                   | text                        | `enterprise`, `mnc`                                                                          |
| `industry`                  | text                        | One of `INDUSTRIES` in shared.                                                               |
| `country`                   | text                        | ISO 3166-1 alpha-2.                                                                          |
| `market`                    | text                        | `SG`, `AU`, `IN`, `ID`, `TH`, `PH`, `HK`, `JP`, `US`, `GB`                                   |
| `employee_band`             | text                        | `1k-5k`, `5k-20k`, `20k+`                                                                    |
| `annual_revenue_band`       | text                        | Free text band, display only.                                                                |
| `owner_name`, `owner_email` | text                        | The account manager. `owner_email` drives RLS.                                               |
| `is_customer`               | boolean                     | Always true in this module (existing customers only).                                        |
| `customer_since`            | date                        | Fallback for tenure when no asset history exists.                                            |

### sites

| Column                   | Type             | Notes                                               |
| ------------------------ | ---------------- | --------------------------------------------------- |
| `account_id`             | uuid FK accounts |                                                     |
| `name`, `city`           | text             |                                                     |
| `country`                | text             | ISO alpha-2.                                        |
| `site_type`              | text             | `hq`, `office`, `plant`, `data_centre`, `warehouse` |
| `on_net`                 | boolean          | False marks a coverage gap signal.                  |
| `opened_on`, `closed_on` | date             | A recent `opened_on` is an expansion signal.        |

### contacts

| Column                         | Type             | Notes                                                                        |
| ------------------------------ | ---------------- | ---------------------------------------------------------------------------- |
| `account_id`                   | uuid FK accounts |                                                                              |
| `full_name`, `title`           | text             |                                                                              |
| `email_masked`                 | text             | The only email column.                                                       |
| `role`                         | text             | `decision_maker`, `influencer`, `technical_buyer`, `champion`, `procurement` |
| `left_company`                 | boolean          |                                                                              |
| `left_on`, `last_contacted_on` | date             |                                                                              |

### assets

Installed Singtel services. Tenure per service is `start_date` to today.

| Column                               | Type                    | Notes                                                                                                                                                                          |
| ------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `account_id`                         | uuid FK accounts        |                                                                                                                                                                                |
| `site_id`                            | uuid FK sites, nullable |                                                                                                                                                                                |
| `product_code`                       | text                    | One of the six: `5G_PLUS`, `CUBE`, `CYBER`, `IOT`, `MOBILITY`, `QSN`                                                                                                           |
| `product_name`                       | text                    | Display copy of the catalog name at the time of sale.                                                                                                                          |
| `status`                             | text                    | `active`, `downgraded`, `cancelled`, `pending`                                                                                                                                 |
| `start_date`, `end_date`             | date                    |                                                                                                                                                                                |
| `quantity`                           | integer                 |                                                                                                                                                                                |
| `currency`                           | text                    |                                                                                                                                                                                |
| `monthly_value`, `monthly_value_sgd` | numeric(12,2)           |                                                                                                                                                                                |
| `previous_monthly_value_sgd`         | numeric(12,2), nullable | Set when `change_type` is `upgraded`, `downgraded` or `removed`. A removed asset has `status = cancelled`, `monthly_value_sgd = 0` and `end_date` the day before `changed_on`. |
| `changed_on`                         | date, nullable          |                                                                                                                                                                                |
| `change_type`                        | text, nullable          | `added`, `upgraded`, `downgraded`, `removed`                                                                                                                                   |

### contracts

| Column                           | Type             | Notes                                                   |
| -------------------------------- | ---------------- | ------------------------------------------------------- |
| `account_id`                     | uuid FK accounts |                                                         |
| `contract_number`                | text, unique     |                                                         |
| `start_date`, `end_date`         | date             | Renewal window = `end_date` within the configured days. |
| `term_months`                    | integer          |                                                         |
| `currency`                       | text             |                                                         |
| `total_value`, `total_value_sgd` | numeric(12,2)    |                                                         |
| `auto_renew`                     | boolean          |                                                         |
| `status`                         | text             | `active`, `expiring`, `expired`, `renewed`              |
| `product_codes`                  | text[]           |                                                         |

### cases

| Column                   | Type                    | Notes                                                                    |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------ |
| `account_id`             | uuid FK accounts        |                                                                          |
| `site_id`                | uuid FK sites, nullable |                                                                          |
| `case_number`            | text, unique            | Shown as the evidence label, for example `C-0412`.                       |
| `opened_on`, `closed_on` | date                    |                                                                          |
| `severity`               | text                    | `low`, `medium`, `high`, `critical`                                      |
| `category`               | text                    | `outage`, `performance`, `billing_query`, `service_request`, `complaint` |
| `subject`, `description` | text                    | Customer text. Competitors appear only as "Competitor A/B/C".            |
| `mentions_competitor`    | boolean                 |                                                                          |
| `competitor_alias`       | text, nullable          | `Competitor A`, `Competitor B`, `Competitor C`                           |
| `csat`                   | smallint, nullable      | 1 to 5.                                                                  |

`billing_query` cases are read as a satisfaction signal only. The module never edits bills.

### activities

| Column                        | Type                       | Notes                                                            |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `account_id`                  | uuid FK accounts           |                                                                  |
| `contact_id`                  | uuid FK contacts, nullable |                                                                  |
| `activity_type`               | text                       | `meeting`, `call`, `email`, `qbr`                                |
| `occurred_on`                 | date                       | Days since the last `meeting` or `qbr` feed relationship health. |
| `subject`, `outcome`, `notes` | text                       |                                                                  |

### bills

Read-only signal. The API exposes bills to compute a spend trend and to resolve an evidence
link. There is no route that writes to this table.

| Column                       | Type             | Notes                                                                    |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `billing_account_id`         | uuid FK accounts | A `billing` account row, or the business account when there is only one. |
| `bill_number`                | text, unique     | For example `INV-2026-004812`.                                           |
| `period_start`, `period_end` | date             |                                                                          |
| `currency`                   | text             |                                                                          |
| `amount`, `amount_sgd`       | numeric(12,2)    |                                                                          |
| `status`                     | text             | `paid`, `due`, `overdue`, `disputed`                                     |
| `product_lines`              | jsonb            | `[{ product_code, description, amount_sgd }]`                            |

### opportunities

| Column                    | Type             | Notes                                                  |
| ------------------------- | ---------------- | ------------------------------------------------------ |
| `account_id`              | uuid FK accounts |                                                        |
| `name`                    | text             |                                                        |
| `opportunity_type`        | text             | `renewal`, `upsell`, `cross_sell`, `executive_meeting` |
| `stage`                   | text             | `identified`, `meeting`, `proposal`, `won`, `lost`     |
| `currency`                | text             |                                                        |
| `amount`, `amount_sgd`    | numeric(12,2)    |                                                        |
| `product_codes`           | text[]           |                                                        |
| `created_on`, `closed_on` | date             |                                                        |
| `source`                  | text             | `account_intelligence`, `manual`                       |
| `lost_reason`             | text, nullable   |                                                        |

Phase 1 displays this table. Phase 3 writes to it (write-back and outcome tracking).

### health_scores

One row per computation; the latest row per account is the one shown.

| Column                 | Type             | Notes                                                                                                                                                 |
| ---------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account_id`           | uuid FK accounts |                                                                                                                                                       |
| `computed_at`          | timestamptz      |                                                                                                                                                       |
| `score`                | smallint         | 0 to 100.                                                                                                                                             |
| `band`                 | text             | `healthy` (70 and above), `watch` (40 to 69), `at_risk` (below 40)                                                                                    |
| `reasons`              | jsonb            | `[{ code, label, points, evidence_ids: [uuid] }]`. Evidence ids point at rows in `cases`, `assets`, `contracts`, `contacts`, `bills` or `activities`. |
| `revenue_at_stake_sgd` | numeric(12,2)    | Used to sort the Account book.                                                                                                                        |
| `rules_version`        | text             | The `rules/config.json` version that produced the row.                                                                                                |

### audit_log

| Column        | Type                       | Notes                                                               |
| ------------- | -------------------------- | ------------------------------------------------------------------- |
| `actor_email` | text                       |                                                                     |
| `action`      | text                       | `view_account`, `compute_health`, `create_opportunity`, `ask_agent` |
| `account_id`  | uuid FK accounts, nullable |                                                                     |
| `details`     | jsonb                      |                                                                     |
| `occurred_at` | timestamptz                |                                                                     |

Written by the server only.

## Indexes

- `accounts(parent_id)`, `accounts(owner_email)`, `accounts(market)`
- `sites(account_id)`, `contacts(account_id)`, `activities(account_id, occurred_on)`
- `assets(account_id, status)`, `contracts(account_id, end_date)`
- `cases(account_id, opened_on)`, `bills(billing_account_id, period_start)`
- `opportunities(account_id, stage)`, `health_scores(account_id, computed_at desc)`
- `audit_log(occurred_at)`

## View

`v_account_book`: one row per `business` account with the latest `health_scores` row, the sum
of active `assets.monthly_value_sgd`, the count of distinct active `product_code` values, the
nearest future `contracts.end_date` and the account's tenure start. The Account book reads this
view only.

## Access control

Supabase settings in this project: automatic RLS on, automatic table exposure off. So the
migration must do three things for every table the API reads:

1. `alter table <t> enable row level security;`
2. `grant select on <t> to authenticated;` (plus `grant usage on schema public to
authenticated;` once). Nothing is granted to `anon`.
3. A `select` policy.

Policies:

- Account visibility: a user may read an account when `auth.jwt() ->> 'email'` equals
  `accounts.owner_email`, or the JWT claim `app_role` is `sales_manager` for the account's
  `market`, or the user owns an ancestor of the account. A `security definer` function
  `account_visible(account_id uuid) returns boolean` implements this once, and every child
  table's policy calls it with its `account_id` (`billing_account_id` for bills).
- `bills`: `select` only. No insert, update or delete policy or grant for any role.
- `opportunities`: `insert` and `update` for the account owner (Phase 3). No delete.
- `health_scores`, `audit_log`: written by the server with the service-role key only;
  `select` on `audit_log` requires `app_role = 'admin'`.
- The service-role key is used by the server-side seeding script only. It is never shipped to
  the web app and never committed.

## Mock adapter notes

- Seed JSON files hold arrays of rows with the columns above, minus the `created_at` and
  `updated_at` audit columns, which are database defaults. Ids are UUID-shaped strings hashed
  from stable keys, so evidence links and tests are stable.
- The files are produced by `data/seed/generate.js`, never edited by hand. Exchange rates are
  fixed simulated values (`FX_TO_SGD` in that script). A test fails if the committed JSON no
  longer matches the generator.
- Bills: one per month for twelve months, November 2025 to October 2026, billed to the
  business account. The latest is `due`, the rest `paid`.
- "Today" is `DEMO_TODAY` when set (demo value `2026-11-16`), otherwise the real clock.
- `stories.json` records, for the ten scripted accounts, the expected band, top reason, gap
  and next action. Tests assert the rules reproduce them.

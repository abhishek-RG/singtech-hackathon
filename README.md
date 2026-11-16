# TelSing

**TelSing** is an AI sales copilot for Singtel enterprise sales teams: it helps account managers
prep accounts, sharpen pitches and close faster.

This repo is the **base scaffold** only: structure, a landing page and a health check.
Features are added by the team on top of it.

**Stack:** npm workspaces · JavaScript (ESM) · Node 20.19+ · React 19 + Vite + React Router ·
Express 5 · plain CSS with design tokens.

## Folder structure

```
.
├── apps/
│   ├── web/                    React 19 + Vite front end (port 5173)
│   │   ├── public/             static files served as-is (favicon)
│   │   └── src/
│   │       ├── pages/          one component per route (Landing, NotFound)
│   │       ├── components/     reusable UI (Navbar, Button, StatusBadge)
│   │       ├── features/       one folder per product feature (empty, see its README)
│   │       ├── lib/            app helpers: api.js fetch wrapper, theme.js
│   │       ├── styles/         tokens.css (design tokens, light/dark) + global.css
│   │       ├── routes.jsx      the route table
│   │       ├── App.jsx         app shell (Navbar + <Outlet />)
│   │       └── main.jsx        entry: router + global styles
│   └── server/                 Express 5 API (port 8787)
│       └── src/
│           ├── routes/         small cross-cutting routes (health)
│           ├── modules/        one folder per domain module (empty, see its README)
│           ├── middleware/     errorHandler (+ HttpError, JSON 404)
│           ├── app.js          builds the Express app: json, cors, routes, errors
│           └── index.js        loads .env and starts the server
├── packages/
│   └── shared/                 constants/utils used by web and server (@telsing/shared)
├── .env.example                copy to .env for local config
├── CLAUDE.md                   conventions for humans and AI assistants
└── package.json                workspaces + root scripts
```

## Quick start

Requires Node **20.19+** (check with `node -v`).

```bash
npm install
cp .env.example .env    # optional, defaults work
npm run dev
```

Open **http://localhost:5173** to reach the sign-in page, then open the customer workspace.

The prototype currently has one preconfigured demo login and no public signup. Copy the values in
`.env.example` into `.env`, then use the configured `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` to
sign in. Replace the example password and session secret before exposing the app beyond local
development. This prototype login is not the final Singtel SSO/authentication setup.

Pasted email conversations are saved under `apps/server/.local-data/` so they remain in the
customer timeline after a server restart. That directory is ignored by Git. Use synthetic content
only; this local file store is a prototype adapter, not production customer-data storage.

The Intelligence tab can retrieve semantically relevant account records using a local Node
embedding model. The model weights download on the first semantic search. Add `GROQ_API_KEY` to
`.env` when you want the app to generate natural-language answers; without it, the app still shows
retrieved source passages.

The Supabase Postgres/pgvector schema and connection check are prepared, but the app remains on
local prototype storage until `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured and the
data access layer is migrated. See `docs/database-setup.md` before enabling the connection.

| Script                 | What it does                                 |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | web (5173) + API (8787) together, hot reload |
| `npm run dev:web`      | web only                                     |
| `npm run dev:server`   | API only                                     |
| `npm run build`        | production build of every workspace          |
| `npm start`            | run the API without watch mode               |
| `npm run format`       | format everything with Prettier              |
| `npm run format:check` | check formatting (for CI)                    |

In dev, Vite proxies `/api/*` to `http://localhost:8787`, so the front end calls `/api/...`
with no CORS setup. Health check: http://localhost:8787/api/health.

## How to add…

### A page

- [ ] Create `apps/web/src/pages/MyPage.jsx` (and `MyPage.css` if needed, using tokens).
- [ ] Register it in `apps/web/src/routes.jsx`: `{ path: 'my-page', element: <MyPage /> }`.
- [ ] If it needs a nav entry, add it to `NAV_LINKS` in `components/Navbar.jsx`.
- [ ] Check it at 375 px wide and in both light and dark mode.

### A feature

- [ ] Create `apps/web/src/features/<feature-name>/` with an entry component (e.g. `AccountBrief.jsx`).
- [ ] Keep its components, styles and API calls inside that folder; call the API via `lib/api.js`.
- [ ] Render it from a page; move anything reused elsewhere to `src/components/`.
- [ ] Put constants shared with the server in `packages/shared/src/index.js`.

### An API route

- [ ] Create `apps/server/src/modules/<name>/<name>.routes.js` exporting an Express `Router`.
- [ ] Put logic in `<name>.service.js`; keep the route handler thin.
- [ ] Respond with `{ ok: true, data }`; for errors `throw new HttpError(status, code, message)`.
- [ ] Mount it in `apps/server/src/app.js`: `app.use(\`${API_PREFIX}/<name>\`, router)`.
- [ ] Try it: `curl http://localhost:8787/api/<name>`, or `api.get('/<name>')` from the web app.

## API response shape

```js
{ ok: true,  data: ... }                          // success
{ ok: false, error: { code: 'NOT_FOUND', message: '...' } }  // failure
```

`GET /api/health` returns `{ ok: true, service: "telsing-api", time }`.

## Branch flow

1. Update `main`: `git checkout main && git pull`.
2. Branch: `git checkout -b feature/<name>` (e.g. `feature/account-brief`).
3. Commit small, clear messages (`feat: ...`, `fix: ...`, `chore: ...`).
4. Run `npm run build` and `npm run format` before pushing.
5. Push and open a **PR to `main`**; get one review, then merge. Never push directly to `main`.

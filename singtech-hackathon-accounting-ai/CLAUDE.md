# SingTech AI: conventions

AI sales copilot for Singtel enterprise sales. npm workspaces, JavaScript ESM, Node 20.19+.
No TypeScript, no CSS frameworks.

## Where code goes

- `apps/web/src/pages/`: one component per route; register it in `routes.jsx`.
- `apps/web/src/features/<name>/`: everything for one feature (components, css, api calls).
- `apps/web/src/components/`: reusable, feature-agnostic UI only.
- `apps/web/src/lib/api.js`: the only place that calls `fetch`. Use `api.get/post/...`.
- `apps/web/src/styles/tokens.css`: design tokens. Use `var(--...)`; never hard-code colors.
  `--accent` is Singtel red. Every UI must work in light and dark and at 375 px.
- `apps/server/src/modules/<name>/`: `<name>.routes.js` (thin) + `<name>.service.js` (logic).
  Mount routers in `apps/server/src/app.js`.
- `packages/shared/src/index.js`: constants/pure utils used by both apps. No DOM or Node APIs.

## API shape

- Success: `{ ok: true, data }`
- Error: `{ ok: false, error: { code, message } }`. Throw `HttpError(status, code, message)`
  from `middleware/errorHandler.js`; the central handler formats it. Express 5 catches async errors.
- `GET /api/health` is the one exception: `{ ok: true, service, time }`.
- All routes live under `/api` (`API_PREFIX` from `@singtech/shared`).

## Keep the server thin

- Handlers: validate input, call a service, respond. No business logic in `app.js` or routes.
- Read config from `process.env` (root `.env`, see `.env.example`). Never commit secrets.
- Add dependencies only to the workspace that needs them: `npm i <pkg> -w @singtech/server`.

## Workflow

- `npm run dev` runs both apps; `npm run build` must pass; `npm run format` before committing.
- Branch `feature/<name>`, PR to `main`. Don't push to `main`.

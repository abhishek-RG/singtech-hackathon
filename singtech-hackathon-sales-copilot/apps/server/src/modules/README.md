# Server modules

One folder per domain module. Empty on purpose — teammates add modules here.

```
modules/
└── accounts/
    ├── accounts.routes.js    # Express Router: parse input, call service, send { ok, data }
    └── accounts.service.js   # business logic / external calls (no req/res here)
```

Rules:

- Routes stay thin: validate input, call the service, respond. Logic lives in the service.
- Success: `res.json({ ok: true, data })`. Errors: `throw new HttpError(status, code, message)`
  from `../middleware/errorHandler.js` — the central handler formats `{ ok: false, error }`.
- Mount the router in `src/app.js`: `app.use(\`${API_PREFIX}/accounts\`, accountsRouter);`
- Constants needed by the web app too go in `packages/shared`.

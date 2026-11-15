# Web features

One folder per feature. Empty on purpose — teammates add features here.

```
features/
└── account-brief/
    ├── AccountBrief.jsx      # feature entry component (used by a page)
    ├── AccountBrief.css      # feature styles (use tokens from styles/tokens.css)
    ├── components/           # components only this feature uses
    └── api.js                # calls for this feature, built on lib/api.js
```

Rules:

- A feature owns its folder; don't import from another feature's internals.
- Reusable UI goes to `src/components/`; cross-app constants go to `packages/shared`.
- Pages (`src/pages/`) compose features; features don't define routes.
- Talk to the API only through `src/lib/api.js`.

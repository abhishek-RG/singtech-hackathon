# SingTech AI

The enterprise sales workspace for Singtel Business account teams. Coming soon.

`main` holds a single static placeholder page served by a small Node server.
There are no dependencies to install.

## Run

Requires Node 20 or newer (`node -v`).

```bash
npm run dev     # http://localhost:3000, restarts when server.js changes
npm start       # same server, no watch mode
npm test        # smoke tests for the server and page
```

Use another port with `PORT=4000 npm run dev` (PowerShell: `$env:PORT=4000; npm run dev`).

## Files

| File                 | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `public/index.html`  | The coming soon page. Light and dark mode, mobile friendly. |
| `public/favicon.svg` | Brand mark, used as the favicon and the header logo.        |
| `server.js`          | Zero-dependency static server. Serves only `public/`.       |
| `server.test.js`     | Tests run by `npm test` (built-in `node:test`).             |
| `CLAUDE.md`          | Conventions for contributors and AI assistants.             |

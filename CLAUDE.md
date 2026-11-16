# SingTech AI: conventions

`main` holds a single "coming soon" page for SingTech AI, the enterprise sales
workspace for Singtel Business account teams. No dependencies, no build step.

## Files

- `public/index.html`: the page. All styles are inline in one `<style>` block.
- `public/favicon.svg`: the brand mark. Used as the favicon and as the header logo, so the
  mark is identical everywhere. It is drawn as a path, not text, so it renders the
  same on every device.
- `server.js`: zero-dependency static server (`node:http`). Serves only files in `public/`
  with a known MIME type. Port from `PORT`, default 3000.
- `server.test.js`: smoke tests using the built-in `node:test` runner.

## Rules

- Colors come from the tokens on `:root`; dark mode redefines them under
  `prefers-color-scheme: dark`. Do not hard-code colors in rules. `--accent` is Singtel red.
- Every change must work in light and dark mode and at 375 px wide with no horizontal scroll.
- Plain enterprise language. No exclamation marks, emoji, or em dashes.
- No client-side JavaScript unless it is needed. Do not add npm dependencies without a reason.
- Never commit secrets or `.env` files.

## Workflow

- `npm run dev` to preview at http://localhost:3000; `npm test` must pass before committing.
- Branch `feature/<name>` and open a PR to `main`.

# SingTech: conventions

`main` holds a single static "coming soon" page for SingTech, the enterprise sales
workspace for Singtel Business account teams. No build step, no dependencies.

## Files

- `index.html`: the page. All styles are inline in one `<style>` block.
- `favicon.svg`: the brand mark. Used as the favicon and as the header logo, so the
  mark is identical everywhere. It is drawn as a path, not text, so it renders the
  same on every device.

## Rules

- Colors come from the tokens on `:root`; dark mode redefines them under
  `prefers-color-scheme: dark`. Do not hard-code colors in rules. `--accent` is Singtel red.
- Every change must work in light and dark mode and at 375 px wide with no horizontal scroll.
- Plain enterprise language. No exclamation marks, emoji, or em dashes.
- No JavaScript unless it is needed.
- Never commit secrets or `.env` files.

## Workflow

- Preview: open `index.html` in a browser, or run `npx serve .`.
- Branch `feature/<name>` and open a PR to `main`.

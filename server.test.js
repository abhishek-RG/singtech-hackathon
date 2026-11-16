import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./server.js";

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test("home page renders the coming soon page", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const html = await res.text();
  assert.match(html, /<title>SingTech AI \| Coming soon<\/title>/);
  assert.match(html, /Coming <span>soon<\/span>/);
});

test("favicon is served as SVG", async () => {
  const res = await fetch(`${base}/favicon.svg`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/svg+xml");
});

test("unknown paths return 404", async () => {
  const res = await fetch(`${base}/missing.html`);
  assert.equal(res.status, 404);
});

test("files outside the site are not served", async () => {
  for (const path of ["/server.js", "/package.json", "/..%2F..%2Fwindows%2Fwin.ini"]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 404, path);
  }
});

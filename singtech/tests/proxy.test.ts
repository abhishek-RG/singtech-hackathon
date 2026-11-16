import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const req = (host: string, path: string) => new NextRequest(`http://${host}${path}`, { headers: { host } });

describe("proxy (open demo, no sign-in)", () => {
  it("serves the landing page, the dashboard and the APIs to any host", () => {
    for (const host of ["singtech.manansethia.com", "localhost:3000"])
      for (const path of ["/", "/dashboard", "/sales-copilot", "/api/rag/stream", "/deal-room"]) expect(proxy(req(host, path)).status).toBe(200);
  });

  it("keeps the AI index rebuild on this machine", () => {
    expect(proxy(req("singtech.manansethia.com", "/api/rag/reindex")).status).toBe(404);
    expect(proxy(req("127.0.0.1:3000", "/api/rag/reindex")).status).toBe(200);
  });

  it("tells the CDN not to store pages or API answers, but lets it cache hashed assets", () => {
    expect(proxy(req("singtech.manansethia.com", "/dashboard")).headers.get("Cloudflare-CDN-Cache-Control")).toBe("no-store");
    expect(proxy(req("singtech.manansethia.com", "/_next/static/chunks/a.js")).headers.get("Cloudflare-CDN-Cache-Control")).toBeNull();
  });
});

import { NextResponse, type NextRequest } from "next/server";

// The hosted demo is open: there is no sign-in (removed 16 Nov 2026 at the owner's request). Visitors land on the product
// page at / and open the dashboard from there. Rebuilding the AI index is an admin task, so it only answers on this machine.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const LOCAL_ONLY = /^\/api\/rag\/reindex$/;

// Pages, RSC payloads and API answers change per request, so the CDN in front (Cloudflare) must never store them.
// Hashed build assets under /_next/static stay cacheable.
function pass(pathname: string) {
  const res = NextResponse.next();
  if (!pathname.startsWith("/_next/static/")) {
    res.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    res.headers.set("CDN-Cache-Control", "no-store");
  }
  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LOCAL_ONLY.test(pathname) && !LOCAL_HOST.test(request.headers.get("host") ?? "")) return new NextResponse("Not found", { status: 404 });
  return pass(pathname);
}

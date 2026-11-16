import dns from "node:dns";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedLookup } from "@/lib/dns-cache";

afterEach(() => vi.restoreAllMocks());

const lookup = (host: string, all = false) =>
  new Promise<{ err: unknown; address: unknown }>((r) => cachedLookup(host, { all }, (err, address) => r({ err, address })));

describe("dns cache", () => {
  it("answers repeat lookups from memory and survives a failing resolver", async () => {
    const spy = vi.spyOn(dns, "lookup").mockImplementation(((_h: string, _o: unknown, cb: (e: null, a: dns.LookupAddress[]) => void) => cb(null, [{ address: "141.163.197.23", family: 4 }])) as never);
    expect((await lookup("sf.example")).address).toBe("141.163.197.23");
    expect((await lookup("sf.example", true)).address).toEqual([{ address: "141.163.197.23", family: 4 }]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("reports a host it never resolved", async () => {
    vi.spyOn(dns, "lookup").mockImplementation(((_h: string, _o: unknown, cb: (e: Error) => void) => cb(Object.assign(new Error("timeout"), { code: "EAI_AGAIN" }))) as never);
    expect((await lookup("never.example")).err).toMatchObject({ code: "EAI_AGAIN" });
  });
});

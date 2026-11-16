import dns, { type LookupAddress } from "node:dns";

// The GPU box resolves through systemd-resolved and Tailscale DNS, which can stall for about 10 s.
// Hot hosts (Salesforce, news feeds) answer from memory and refresh in the background; a failed lookup reuses the last good answer.
const FRESH_MS = 5 * 60_000;
const cache = new Map<string, { at: number; addrs: LookupAddress[] }>();

type Callback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function reply(addrs: LookupAddress[], options: { all?: boolean }, cb: Callback) {
  if (options.all) cb(null, addrs);
  else cb(null, addrs[0].address, addrs[0].family);
}

function resolve(hostname: string, done: (err: NodeJS.ErrnoException | null, addrs?: LookupAddress[]) => void) {
  dns.lookup(hostname, { all: true }, (err, addrs) => {
    if (!err && addrs.length) cache.set(hostname, { at: Date.now(), addrs });
    done(err, addrs);
  });
}

export function cachedLookup(hostname: string, options: { all?: boolean }, cb: Callback) {
  const hit = cache.get(hostname);
  if (hit && Date.now() - hit.at < FRESH_MS) return reply(hit.addrs, options, cb);
  if (hit) {
    // Stale but usable: answer now, refresh for next time.
    resolve(hostname, () => {});
    return reply(hit.addrs, options, cb);
  }
  resolve(hostname, (err, addrs) => (err || !addrs?.length ? cb(err ?? Object.assign(new Error(`No address for ${hostname}`), { code: "ENOTFOUND" }), []) : reply(addrs, options, cb)));
}

export const dnsCacheSize = () => cache.size;

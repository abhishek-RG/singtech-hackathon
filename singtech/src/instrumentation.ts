// Runs once when the server starts: every server fetch gets the DNS cache, and the Salesforce connection opens early.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ Agent, setGlobalDispatcher }, { cachedLookup }, { warmSalesforce }] = await Promise.all([import("undici"), import("@/lib/dns-cache"), import("@/lib/salesforce")]);
  setGlobalDispatcher(new Agent({ connect: { lookup: cachedLookup as never } }));
  void warmSalesforce();
  // Keeps the token, DNS and the Chatter path warm between demos: about 6 API calls an hour.
  setInterval(() => void warmSalesforce(), 10 * 60_000).unref();
}

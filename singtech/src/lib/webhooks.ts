// Destinations come only from server env, never from the request, so the CRM route cannot be pointed at arbitrary hosts.
// Shared by the route and the Outbox so "configured" means the same thing in both.
export function webhookUrl(name: "SLACK_WEBHOOK_URL" | "SALESFORCE_WEBHOOK_URL") {
  const value = process.env[name];
  if (!value) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

// Totals for a set of account book rows. Shared by the Account book tiles and the landing page
// preview, so both always show the same numbers for the same rows.

/** Rows sorted the way the Account book opens: revenue at stake, highest first, then by name. */
export function sortByStake(rows) {
  return [...rows].sort(
    (a, b) => b.revenue_at_stake_sgd - a.revenue_at_stake_sgd || a.name.localeCompare(b.name),
  );
}

export function summariseBook(rows) {
  return {
    count: rows.length,
    atRisk: rows.filter((r) => r.health.band === 'at_risk').length,
    stake: rows.reduce((sum, r) => sum + r.revenue_at_stake_sgd, 0),
    products: rows.length ? rows.reduce((sum, r) => sum + r.products_owned, 0) / rows.length : 0,
  };
}

// Revenue at stake: annual recurring revenue weighted by health band (rules config).
// The Account book sorts by this, so at-risk revenue rises to the top.

export function revenueAtStake(assets, band, config) {
  const monthlySgd = assets
    .filter((a) => a.status !== 'cancelled')
    .reduce((sum, a) => sum + a.monthly_value_sgd, 0);
  const arrSgd = Math.round(monthlySgd * 12 * 100) / 100;
  const weight = config.revenue_at_stake.band_weight[band];
  return {
    monthly_sgd: Math.round(monthlySgd * 100) / 100,
    arr_sgd: arrSgd,
    weight,
    revenue_at_stake_sgd: Math.round(arrSgd * weight),
  };
}

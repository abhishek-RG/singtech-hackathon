// The "Simulated data" label shown on every Account Intelligence screen while the data comes
// from the simulated connector rather than a live system.

export default function SimulatedDataBanner({ simulated = true }) {
  if (!simulated) return null;
  return (
    <p className="acct-sim" role="note">
      <span className="acct-sim__dot" aria-hidden="true" />
      <strong>Simulated data</strong>
      <span className="acct-sim__detail">Fictional companies and people. Not live CRM data.</span>
    </p>
  );
}

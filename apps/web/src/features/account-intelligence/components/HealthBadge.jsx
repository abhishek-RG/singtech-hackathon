import { bandLabel } from '../format.js';

/** Health band pill. Colour always comes with the text label, never on its own. */
export default function HealthBadge({ band, score, size = 'md' }) {
  const label = bandLabel(band);
  return (
    <span
      className={`acct-health acct-health--${band} acct-health--${size}`}
      aria-label={score === undefined ? label : `${label}, score ${score} of 100`}
    >
      <span className="acct-health__dot" aria-hidden="true" />
      <span aria-hidden="true">{label}</span>
      {score !== undefined && (
        <span className="acct-health__score" aria-hidden="true">
          {score}
        </span>
      )}
    </span>
  );
}

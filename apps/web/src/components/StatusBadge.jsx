import './StatusBadge.css';

/**
 * <StatusBadge status="ok">API connected</StatusBadge>
 * status: "ok" | "error" | "loading" | "idle"
 */
export default function StatusBadge({ status = 'idle', children }) {
  return (
    <span className={`status-badge status-badge--${status}`} role="status" aria-live="polite">
      <span className="status-badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

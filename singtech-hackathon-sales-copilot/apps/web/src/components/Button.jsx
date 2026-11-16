import { Link } from 'react-router';
import './Button.css';

/**
 * <Button>Save</Button>                    -> <button>
 * <Button to="/accounts">Open</Button>     -> router <Link>
 * <Button href="#section">Jump</Button>    -> plain <a>
 * variant: "primary" | "secondary" | "ghost"   size: "md" | "sm"
 */
export default function Button({
  to,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ');

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

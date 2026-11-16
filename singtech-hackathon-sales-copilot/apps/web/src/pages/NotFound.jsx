import Button from '../components/Button.jsx';

export default function NotFound() {
  return (
    <div className="container page-center">
      <p className="page-center__code">404</p>
      <h1>Page not found</h1>
      <p className="text-muted">The page you are looking for does not exist.</p>
      <Button to="/">Back to home</Button>
    </div>
  );
}

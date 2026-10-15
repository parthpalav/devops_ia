import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="empty-state">
      <h1>Page not found</h1>
      <Link to="/" className="button button-secondary">
        Go to dashboard
      </Link>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Invalid email or password' : 'Unable to sign in. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-card">
        <div className="brand brand-large">
          <span className="brand-mark" aria-hidden="true">
            ✓
          </span>
          <span className="brand-name">OpsDesk</span>
        </div>
        <h1>Sign in</h1>
        <p className="muted">Support ticket portal</p>

        <form onSubmit={handleSubmit} noValidate aria-label="Sign in">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button button-primary button-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <aside className="demo-hint" aria-label="Demo credentials">
          <strong>Demo account</strong>
          <span>demo@example.com / Demo123!</span>
        </aside>
      </main>
    </div>
  );
}

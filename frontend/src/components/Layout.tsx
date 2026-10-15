import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { setUnauthorizedHandler } from '../services/api';

export function Layout() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  // An API 401 (expired/invalid token) ends the session; ProtectedRoute then redirects to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      notify('Your session has expired. Please sign in again.', 'error');
    });
    return () => setUnauthorizedHandler(null);
  }, [logout, notify]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✓
          </span>
          <span className="brand-name">OpsDesk</span>
        </div>
        <nav aria-label="Main" className="nav">
          <NavLink to="/" end className="nav-link">
            Dashboard
          </NavLink>
          <NavLink to="/tickets" className="nav-link">
            Tickets
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <p className="signed-in-as">
            Signed in as <strong>{user?.email}</strong>
          </p>
          <button type="button" className="button button-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

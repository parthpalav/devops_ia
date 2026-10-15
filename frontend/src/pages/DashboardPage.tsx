import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { api } from '../services/api';
import { formatTimestamp } from '../services/format';
import type { Ticket } from '../types';

const RECENT_COUNT = 5;

function StatCard({ id, label, value, tone }: { id: string; label: string; value: number; tone: string }) {
  return (
    <section className={`stat-card stat-${tone}`} aria-labelledby={id}>
      <h2 id={id} className="stat-label">
        {label}
      </h2>
      <p className="stat-value">{value}</p>
    </section>
  );
}

export function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listTickets({}, controller.signal)
      .then(setTickets)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load tickets');
      });
    return () => controller.abort();
  }, []);

  const count = (status: Ticket['status']) => tickets?.filter((ticket) => ticket.status === status).length ?? 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Overview of support activity</p>
        </div>
        <Link to="/tickets" className="button button-secondary">
          View all tickets
        </Link>
      </header>

      {error && (
        <p className="form-error" role="alert">
          Could not load dashboard: {error}
        </p>
      )}
      {!tickets && !error && <p className="muted">Loading dashboard…</p>}

      {tickets && (
        <>
          <div className="stat-grid">
            <StatCard id="stat-total" label="Total tickets" value={tickets.length} tone="total" />
            <StatCard id="stat-open" label="Open" value={count('OPEN')} tone="open" />
            <StatCard id="stat-in-progress" label="In progress" value={count('IN_PROGRESS')} tone="in-progress" />
            <StatCard id="stat-resolved" label="Resolved" value={count('RESOLVED')} tone="resolved" />
          </div>

          <section className="panel" aria-labelledby="recent-heading">
            <h2 id="recent-heading">Recent tickets</h2>
            {tickets.length === 0 ? (
              <p className="muted">No tickets yet.</p>
            ) : (
              <ul className="recent-list">
                {tickets.slice(0, RECENT_COUNT).map((ticket) => (
                  <li key={ticket.id} className="recent-item">
                    <div>
                      <Link to={`/tickets/${ticket.id}`} className="ticket-link">
                        {ticket.title}
                      </Link>
                      <p className="muted small">
                        #{ticket.id} · updated {formatTimestamp(ticket.updatedAt)}
                      </p>
                    </div>
                    <div className="badge-group">
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

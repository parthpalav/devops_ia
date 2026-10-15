import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { api } from '../services/api';
import { formatTimestamp } from '../services/format';
import { PRIORITIES, STATUSES, type Ticket } from '../types';

const SEARCH_DEBOUNCE_MS = 250;

export function TicketsPage() {
  // Filters live in the URL (?search=&status=&priority=) so views are linkable and survive reloads.
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const search = searchParams.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Push the debounced search text into the URL. Only a change of the debounced text triggers this,
  // so "Clear filters" cannot be overwritten by a stale, still-pending search value.
  const updateParamRef = useRef(updateParam);
  updateParamRef.current = updateParam;
  useEffect(() => {
    updateParamRef.current('search', debouncedSearch.trim());
  }, [debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .listTickets({ search, status, priority }, controller.signal)
      .then((result) => {
        setTickets(result);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Could not load tickets');
        setLoading(false);
      });
    return () => controller.abort();
  }, [search, status, priority, reloadKey]);

  const hasFilters = Boolean(search || status || priority);

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Tickets</h1>
          <p className="muted">Create, track and resolve support requests</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setCreating(true)}>
          New ticket
        </button>
      </header>

      <section className="toolbar" aria-label="Search and filters">
        <div className="field field-grow">
          <label htmlFor="ticket-search">Search tickets</label>
          <input
            id="ticket-search"
            type="search"
            placeholder="Search by title…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="status-filter">Filter by status</label>
          <select id="status-filter" value={status} onChange={(event) => updateParam('status', event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="priority-filter">Filter by priority</label>
          <select id="priority-filter" value={priority} onChange={(event) => updateParam('priority', event.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button type="button" className="button button-ghost toolbar-clear" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </section>

      {error && (
        <p className="form-error" role="alert">
          Could not load tickets: {error}
        </p>
      )}

      {/* The summary is only shown once the current query has finished loading (tests rely on this). */}
      <p className="results-summary muted" aria-live="polite">
        {loading ? 'Loading tickets…' : `Showing ${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}`}
      </p>

      {!loading && tickets.length === 0 && !error ? (
        <div className="empty-state">
          <p>{hasFilters ? 'No tickets match your filters.' : 'No tickets yet. Create the first one!'}</p>
        </div>
      ) : (
        <div className="table-wrapper" aria-busy={loading}>
          <table className="ticket-table">
            <caption className="visually-hidden">Tickets</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Title</th>
                <th scope="col">Description</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Created (UTC)</th>
                <th scope="col">Updated (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="cell-id">#{ticket.id}</td>
                  <td className="cell-title">
                    <Link to={`/tickets/${ticket.id}`} className="ticket-link">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="cell-description" title={ticket.description}>
                    {ticket.description}
                  </td>
                  <td>
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="cell-date">{formatTimestamp(ticket.createdAt, { withZone: false })}</td>
                  <td className="cell-date">{formatTimestamp(ticket.updatedAt, { withZone: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateTicketModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setReloadKey((key) => key + 1);
          }}
        />
      )}
    </>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { Modal } from '../components/Modal';
import { TicketFields, validateTicket, type TicketFormErrors, type TicketFormValues } from '../components/TicketFields';
import { useToast } from '../hooks/useToast';
import { api, ApiError } from '../services/api';
import { formatTimestamp } from '../services/format';
import type { Ticket } from '../types';

function toFormValues(ticket: Ticket): TicketFormValues {
  return { title: ticket.title, description: ticket.description, priority: ticket.priority, status: ticket.status };
}

export function TicketDetailPage() {
  const { id } = useParams();
  const ticketId = Number(id);
  const navigate = useNavigate();
  const { notify } = useToast();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<TicketFormValues | null>(null);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setTicket(null);
    setLoadError(null);
    api
      .getTicket(ticketId, controller.signal)
      .then((loaded) => {
        setTicket(loaded);
        setValues(toFormValues(loaded));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof ApiError && err.status === 404 ? 'Ticket not found' : 'Could not load the ticket');
      });
    return () => controller.abort();
  }, [ticketId]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticket || !values) return;
    const validation = validateTicket(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    try {
      const updated = await api.updateTicket(ticket.id, {
        title: values.title.trim(),
        description: values.description.trim(),
        priority: values.priority,
        status: values.status,
      });
      setTicket(updated);
      setValues(toFormValues(updated));
      notify(`Ticket #${updated.id} updated`);
    } catch (err) {
      notify(err instanceof ApiError ? `Could not save: ${err.message}` : 'Could not save the ticket', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket) return;
    setDeleting(true);
    try {
      await api.deleteTicket(ticket.id);
      notify(`Ticket #${ticket.id} deleted`);
      navigate('/tickets', { replace: true });
    } catch (err) {
      notify(err instanceof ApiError ? `Could not delete: ${err.message}` : 'Could not delete the ticket', 'error');
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  if (loadError) {
    return (
      <div className="empty-state">
        <h1>{loadError}</h1>
        <Link to="/tickets" className="button button-secondary">
          Back to tickets
        </Link>
      </div>
    );
  }

  if (!ticket || !values) return <p className="muted">Loading ticket…</p>;

  return (
    <>
      <Link to="/tickets" className="back-link">
        ← Back to tickets
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">Ticket #{ticket.id}</p>
          <h1>{ticket.title}</h1>
          <div className="badge-group" role="group" aria-label="Current state">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
        <button type="button" className="button button-danger" onClick={() => setConfirmingDelete(true)}>
          Delete ticket
        </button>
      </header>

      <div className="detail-grid">
        <section className="panel" aria-labelledby="edit-heading">
          <h2 id="edit-heading">Edit ticket</h2>
          <form onSubmit={handleSave} noValidate aria-labelledby="edit-heading">
            <TicketFields idPrefix="edit-ticket" values={values} errors={errors} onChange={setValues} showStatus />
            <div className="form-actions">
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        <aside className="panel meta-panel" aria-label="Ticket details">
          <dl>
            <dt>ID</dt>
            <dd>#{ticket.id}</dd>
            <dt>Created</dt>
            <dd>{formatTimestamp(ticket.createdAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatTimestamp(ticket.updatedAt)}</dd>
          </dl>
        </aside>
      </div>

      {confirmingDelete && (
        <Modal title="Delete ticket?" size="small" onClose={() => !deleting && setConfirmingDelete(false)}>
          <p>
            “{ticket.title}” will be permanently deleted. This cannot be undone.
          </p>
          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="button button-danger" onClick={handleDelete} disabled={deleting} autoFocus>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

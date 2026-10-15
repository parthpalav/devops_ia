import { useState, type FormEvent } from 'react';
import { useToast } from '../hooks/useToast';
import { api, ApiError } from '../services/api';
import type { Ticket } from '../types';
import { Modal } from './Modal';
import { TicketFields, validateTicket, type TicketFormErrors, type TicketFormValues } from './TicketFields';

type Props = { onClose: () => void; onCreated: (ticket: Ticket) => void };

const EMPTY: TicketFormValues = { title: '', description: '', priority: 'MEDIUM' };

export function CreateTicketModal({ onClose, onCreated }: Props) {
  const { notify } = useToast();
  const [values, setValues] = useState<TicketFormValues>(EMPTY);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateTicket(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const ticket = await api.createTicket({
        title: values.title.trim(),
        description: values.description.trim(),
        priority: values.priority,
      });
      notify(`Ticket #${ticket.id} created`);
      onCreated(ticket);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'Could not create the ticket. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal title="New ticket" onClose={onClose}>
      {/* noValidate: we render our own visible, accessible validation messages. */}
      <form onSubmit={handleSubmit} noValidate aria-label="New ticket">
        <TicketFields idPrefix="new-ticket" values={values} errors={errors} onChange={setValues} autoFocus />
        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

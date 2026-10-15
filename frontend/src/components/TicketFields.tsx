import { PRIORITIES, STATUSES, type Priority, type Status } from '../types';

export type TicketFormValues = { title: string; description: string; priority: Priority; status?: Status };
export type TicketFormErrors = Partial<Record<'title' | 'description', string>>;

/** Client-side validation mirroring the backend Zod schema (required, trimmed). */
export function validateTicket(values: TicketFormValues): TicketFormErrors {
  const errors: TicketFormErrors = {};
  if (!values.title.trim()) errors.title = 'Title is required';
  else if (values.title.trim().length > 200) errors.title = 'Title must be 200 characters or fewer';
  if (!values.description.trim()) errors.description = 'Description is required';
  return errors;
}

type TicketFieldsProps = {
  idPrefix: string;
  values: TicketFormValues;
  errors: TicketFormErrors;
  onChange: (values: TicketFormValues) => void;
  showStatus?: boolean;
  autoFocus?: boolean;
};

/** Shared, labelled form fields for creating and editing tickets. */
export function TicketFields({ idPrefix, values, errors, onChange, showStatus = false, autoFocus = false }: TicketFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <>
      <div className="field">
        <label htmlFor={id('title')}>Title</label>
        <input
          id={id('title')}
          type="text"
          value={values.title}
          maxLength={200}
          autoFocus={autoFocus}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? id('title-error') : undefined}
          onChange={(event) => onChange({ ...values, title: event.target.value })}
        />
        {errors.title && (
          <p id={id('title-error')} className="field-error" role="alert">
            {errors.title}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={id('description')}>Description</label>
        <textarea
          id={id('description')}
          rows={4}
          value={values.description}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? id('description-error') : undefined}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
        {errors.description && (
          <p id={id('description-error')} className="field-error" role="alert">
            {errors.description}
          </p>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={id('priority')}>Priority</label>
          <select
            id={id('priority')}
            value={values.priority}
            onChange={(event) => onChange({ ...values, priority: event.target.value as Priority })}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>

        {showStatus && (
          <div className="field">
            <label htmlFor={id('status')}>Status</label>
            <select
              id={id('status')}
              value={values.status}
              onChange={(event) => onChange({ ...values, status: event.target.value as Status })}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </>
  );
}

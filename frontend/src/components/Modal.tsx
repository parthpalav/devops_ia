import { useEffect, useId, type ReactNode } from 'react';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'small' | 'medium';
};

/** Accessible dialog: role="dialog", labelled by its heading, closes on Escape or backdrop click. */
export function Modal({ title, onClose, children, size = 'medium' }: ModalProps) {
  const headingId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <h2 id={headingId} className="modal-title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

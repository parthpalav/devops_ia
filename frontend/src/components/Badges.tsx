import type { Priority, Status } from '../types';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge status-${status.toLowerCase()}`}>{status}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge priority-${priority.toLowerCase()}`}>{priority}</span>;
}

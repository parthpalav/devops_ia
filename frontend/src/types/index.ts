// Values are identical to the SQL CHECK constraints, backend Zod schemas and Playwright tests.
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export type Ticket = {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type User = { id: string; email: string };

export type TicketFilters = { search?: string; status?: string; priority?: string };

export type NewTicketInput = { title: string; description: string; priority: Priority };

export type TicketChanges = Partial<{ title: string; description: string; priority: Priority; status: Status }>;

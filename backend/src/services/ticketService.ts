import type { Db } from '../db/pool.js';

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

export type TicketFilters = { status?: Status; priority?: Priority; search?: string };
export type NewTicket = { title: string; description: string; priority: Priority };
export type TicketChanges = Partial<{ title: string; description: string; priority: Priority; status: Status }>;

const COLUMNS = `
  id, title, description, priority, status,
  created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`;

/** Escapes LIKE wildcards so a search for "50%" matches the literal text. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export class TicketService {
  constructor(private readonly db: Db) {}

  /** Newest first (id DESC) - an explicit, deterministic ordering. */
  async list(filters: TicketFilters): Promise<Ticket[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filters.priority) {
      params.push(filters.priority);
      conditions.push(`priority = $${params.length}`);
    }
    if (filters.search) {
      params.push(likePattern(filters.search));
      conditions.push(`title ILIKE $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<Ticket>(`SELECT ${COLUMNS} FROM tickets ${where} ORDER BY id DESC`, params);
    return result.rows;
  }

  async get(id: number): Promise<Ticket | null> {
    const result = await this.db.query<Ticket>(`SELECT ${COLUMNS} FROM tickets WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  }

  async create(input: NewTicket, userId: string): Promise<Ticket> {
    const result = await this.db.query<Ticket>(
      `INSERT INTO tickets (title, description, priority, status, created_by)
       VALUES ($1, $2, $3, 'OPEN', $4)
       RETURNING ${COLUMNS}`,
      [input.title, input.description, input.priority, userId],
    );
    return result.rows[0];
  }

  /**
   * DEMO FAULT (drop_ticket_write): builds the exact response a successful insert would return,
   * including a real sequence ID, but never writes the row. The API "succeeds"; the data is lost.
   */
  async createWithoutPersisting(input: NewTicket, userId: string): Promise<Ticket> {
    const result = await this.db.query<{ id: number; now: string }>(
      `SELECT nextval(pg_get_serial_sequence('tickets', 'id'))::int AS id, now() AS now`,
    );
    const { id, now } = result.rows[0];
    return { id, ...input, status: 'OPEN', createdBy: userId, createdAt: now, updatedAt: now };
  }

  async update(id: number, changes: TicketChanges): Promise<Ticket | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];
    for (const column of ['title', 'description', 'priority', 'status'] as const) {
      const value = changes[column];
      if (value !== undefined) {
        params.push(value);
        assignments.push(`${column} = $${params.length}`);
      }
    }
    params.push(id);
    const result = await this.db.query<Ticket>(
      `UPDATE tickets SET ${assignments.join(', ')}, updated_at = now()
       WHERE id = $${params.length}
       RETURNING ${COLUMNS}`,
      params,
    );
    return result.rows[0] ?? null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM tickets WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Restores the deterministic seed defined in database/init/002_seed.sql. */
  async resetToSeed(): Promise<number> {
    const result = await this.db.query<{ count: number }>('SELECT reset_demo_data() AS count');
    return result.rows[0].count;
  }
}

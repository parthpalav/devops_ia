import type { NewTicketInput, Ticket, TicketChanges, TicketFilters, User } from '../types';

/** All requests are same-origin `/api/...`; Nginx (Docker) or Vite (local dev) proxies them to the backend. */
const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when an authenticated request returns 401 (e.g. expired token). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_GET_ATTEMPTS = 3;

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  // Reads are retried briefly on gateway errors / network failures (e.g. backend restarting).
  // Writes are never retried automatically, so an action is never applied twice.
  const attempts = method === 'GET' ? MAX_GET_ATTEMPTS : 1;
  let response: Response | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === attempts) break;
    } catch (error) {
      if (signal?.aborted || attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
  }
  if (!response) throw new ApiError(0, 'Network error');

  if (response.status === 401 && authToken) onUnauthorized?.();
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return data as T;
}

function toQuery(filters: TicketFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('POST', '/auth/login', { email, password }),
  listTickets: (filters: TicketFilters = {}, signal?: AbortSignal) =>
    request<Ticket[]>('GET', `/tickets${toQuery(filters)}`, undefined, signal),
  getTicket: (id: number, signal?: AbortSignal) => request<Ticket>('GET', `/tickets/${id}`, undefined, signal),
  createTicket: (input: NewTicketInput) => request<Ticket>('POST', '/tickets', input),
  updateTicket: (id: number, changes: TicketChanges) => request<Ticket>('PUT', `/tickets/${id}`, changes),
  deleteTicket: (id: number) => request<void>('DELETE', `/tickets/${id}`),
};

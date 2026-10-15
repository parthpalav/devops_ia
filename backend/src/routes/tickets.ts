import { Router } from 'express';
import { z } from 'zod';
import type { FaultMode } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { PRIORITIES, STATUSES, type TicketService } from '../services/ticketService.js';

const title = z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer');
const description = z.string().trim().min(1, 'Description is required').max(5000);

const createSchema = z.object({
  title,
  description,
  priority: z.enum(PRIORITIES).default('MEDIUM'),
});

const updateSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    priority: z.enum(PRIORITIES).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

// Empty query values (e.g. ?status=) mean "no filter".
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const listQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(STATUSES).optional()),
  priority: z.preprocess(emptyToUndefined, z.enum(PRIORITIES).optional()),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
});

const idSchema = z.coerce.number().int().positive();

function parseId(raw: string): number {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, 'Ticket not found');
  return parsed.data;
}

export function ticketsRouter(tickets: TicketService, faultMode: FaultMode): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const filters = listQuerySchema.parse(req.query);
    res.json(await tickets.list(filters));
  });

  router.get('/:id', async (req, res) => {
    const ticket = await tickets.get(parseId(req.params.id));
    if (!ticket) throw new HttpError(404, 'Ticket not found');
    res.json(ticket);
  });

  router.post('/', async (req, res) => {
    const input = createSchema.parse(req.body);

    // DEMO-ONLY FAULT INJECTION (FAULT_INJECTION_MODE=drop_ticket_write, never enabled by default):
    // validate normally and answer 201 Created with a realistic ticket, but silently skip the INSERT.
    // An API status check would pass; only an end-to-end check of the user-visible outcome catches it.
    if (faultMode === 'drop_ticket_write') {
      const phantom = await tickets.createWithoutPersisting(input, req.user!.id);
      console.warn(`[backend] DEMO FAULT drop_ticket_write: acknowledged ticket #${phantom.id} "${input.title}" but did NOT save it`);
      res.status(201).json(phantom);
      return;
    }

    const ticket = await tickets.create(input, req.user!.id);
    res.status(201).json(ticket);
  });

  router.put('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const changes = updateSchema.parse(req.body);
    const ticket = await tickets.update(id, changes);
    if (!ticket) throw new HttpError(404, 'Ticket not found');
    res.json(ticket);
  });

  router.delete('/:id', async (req, res) => {
    const removed = await tickets.remove(parseId(req.params.id));
    if (!removed) throw new HttpError(404, 'Ticket not found');
    res.status(204).end();
  });

  return router;
}

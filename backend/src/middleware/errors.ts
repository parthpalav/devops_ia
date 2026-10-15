import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

/** Central error handler. Express 5 forwards rejected promises from async handlers here. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  // body-parser marks malformed JSON with status 400.
  if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 400) {
    res.status(400).json({ error: 'Malformed request body' });
    return;
  }
  console.error('[backend] unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
}

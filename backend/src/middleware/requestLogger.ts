import type { NextFunction, Request, Response } from 'express';

/** One concise line per API request, e.g. `[backend] POST /api/tickets 201 8ms`. Health probes are skipped. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next();
  const started = performance.now();
  res.on('finish', () => {
    const ms = Math.round(performance.now() - started);
    console.log(`[backend] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
}

import type { NextFunction, Request, Response } from 'express';
import type { AuthService, AuthUser } from '../services/authService.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

/** Requires a valid `Authorization: Bearer <jwt>` header. */
export function requireAuth(auth: AuthService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    const user = scheme === 'Bearer' && token ? auth.verifyToken(token) : null;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    req.user = user;
    next();
  };
}

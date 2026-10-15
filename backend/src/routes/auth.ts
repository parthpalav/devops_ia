import { Router } from 'express';
import { z } from 'zod';
import type { AuthService } from '../services/authService.js';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').max(255),
  password: z.string().min(1, 'Password is required').max(200),
});

export function authRouter(auth: AuthService): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await auth.verifyCredentials(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    res.json({ token: auth.issueToken(user), user });
  });

  return router;
}

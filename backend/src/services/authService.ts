import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Db } from '../db/pool.js';

export type AuthUser = { id: string; email: string };

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly jwtSecret: string,
    private readonly jwtExpiresIn: string,
  ) {}

  /** Returns the user when the credentials are valid, otherwise null (no hint about which part was wrong). */
  async verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
    const result = await this.db.query<{ id: string; email: string; password_hash: string }>(
      'SELECT id, email, password_hash FROM users WHERE lower(email) = lower($1)',
      [email],
    );
    const user = result.rows[0];
    if (!user) return null;
    const matches = await bcrypt.compare(password, user.password_hash);
    return matches ? { id: user.id, email: user.email } : null;
  }

  issueToken(user: AuthUser): string {
    return jwt.sign({ email: user.email }, this.jwtSecret, {
      subject: user.id,
      expiresIn: this.jwtExpiresIn as SignOptions['expiresIn'],
    });
  }

  verifyToken(token: string): AuthUser | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret);
      if (typeof payload === 'string' || !payload.sub || typeof payload.email !== 'string') return null;
      return { id: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }
}

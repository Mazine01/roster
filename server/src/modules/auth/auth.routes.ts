import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { loginSchema, type LoginInput } from '@roster/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../lib/env.js';
import { validate } from '../../middleware/validate.js';
import { clearSessionCookie, requireAuth, setSessionCookie, type SessionUser } from '../../middleware/auth.js';

export const authRouter = Router();

// 10 attempts per 15 minutes per IP slows down password guessing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) =>
    next(new AppError(429, 'TOO_MANY_ATTEMPTS', 'Too many sign-in attempts. Wait 15 minutes and try again.')),
});

// A real hash of a random string, checked when the email is unknown, so unknown
// emails take as long as wrong passwords (no learning which emails exist by timing).
const dummyHash = hash(randomBytes(16).toString('hex'));

authRouter.post('/login', loginLimiter, validate(loginSchema), async (_req, res) => {
  const { email, password } = res.locals.body as LoginInput;
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const ok = await verify(user?.passwordHash ?? (await dummyHash), password).catch(() => false);

  if (!user || !ok) throw AppError.unauthorized('Email or password is incorrect');

  setSessionCookie(res, { id: user.id, role: user.role });
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (_req, res) => {
  const { id } = res.locals.user as SessionUser;
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, id));
  if (!user) throw AppError.unauthorized();
  res.json({ user });
});

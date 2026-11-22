import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProd } from '../lib/env.js';
import { AppError } from '../lib/errors.js';

export const AUTH_COOKIE = 'roster_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: number;
  role: 'ADMIN';
}

export function setSessionCookie(res: Response, user: SessionUser) {
  const token = jwt.sign({ sub: String(user.id), role: user.role }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProd || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: isProd || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
  });
}

/** Rejects the request with 401 unless it carries a valid session cookie. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next(AppError.unauthorized());
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    res.locals.user = { id: Number(payload.sub), role: payload.role } satisfies SessionUser;
    next();
  } catch {
    next(AppError.unauthorized('Your session has expired. Sign in again.'));
  }
};

/** Use after requireAuth. Checks the role on the server, never trusting the UI. */
export const requireRole =
  (...roles: SessionUser['role'][]): RequestHandler =>
  (_req, res, next) => {
    const user = res.locals.user as SessionUser | undefined;
    if (!user || !roles.includes(user.role)) return next(AppError.forbidden());
    next();
  };

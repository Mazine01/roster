import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './lib/env.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { studentsRouter } from './modules/students/students.routes.js';
import { programsRouter } from './modules/programs/programs.routes.js';
import { statsRouter } from './modules/stats/stats.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // behind Render/Vercel proxies: real client IP for rate limiting
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);

  // Everything below needs a signed-in admin.
  const admin = [requireAuth, requireRole('ADMIN')];
  app.use('/api/students', admin, studentsRouter);
  app.use('/api/programs', admin, programsRouter);
  app.use('/api/stats', admin, statsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

# Security notes

Roster holds personal data (names, birth dates, contact details), so it is built to the same habits a production app would need.

| Risk | What Roster does | Where |
| --- | --- | --- |
| Stolen passwords | Passwords are hashed with **argon2id**, never stored or logged in plain text. | `server/src/db/seed.ts`, `auth.routes.ts` |
| Password guessing | Login is **rate-limited** to 10 attempts per 15 minutes per IP. | `auth.routes.ts` |
| Account discovery | Wrong password and unknown email return the **same message and take the same time**, because a dummy hash is checked when the email does not exist. | `auth.routes.ts` |
| Token theft via XSS | The session JWT lives in an **httpOnly** cookie that JavaScript cannot read. It is Secure in production and expires after 7 days. | `middleware/auth.ts` |
| CSRF | The cookie is **SameSite=Lax** locally. In production (cross-site) it is SameSite=None + Secure, combined with a strict **CORS allowlist** and JSON-only bodies. | `app.ts` |
| Forged tokens | Tokens are verified with a 32+ character secret, so a forged or `alg: none` token is rejected (covered by a test). | `middleware/auth.ts`, `tests/` |
| Unauthorized access | Every data route requires a session **and** the ADMIN role, checked on the server. | `app.ts` |
| SQL injection | All queries go through Drizzle's parameterized builder. Search text has LIKE wildcards escaped. | `students.service.ts` |
| Bad input | Every body, query and URL parameter is validated by **Zod** before a handler runs. JSON bodies are capped at 100 kB. | `middleware/validate.ts` |
| CSV formula injection | Exported cells starting with `=`, `+`, `-` or `@` are prefixed, so Excel will not execute them. | `students.service.ts` |
| Information leaks | Errors return a fixed shape with no stack traces. `x-powered-by` is disabled and **Helmet** sets security headers. | `errorHandler.ts`, `app.ts` |
| Secrets in git | Secrets come only from environment variables. `.env` is git-ignored and `.env.example` documents each one. | `lib/env.ts` |

The app also validates its own environment on startup (`lib/env.ts`): it refuses to boot with a missing database URL or a short JWT secret.

## Reporting

Found something? Open an issue or email the maintainer.

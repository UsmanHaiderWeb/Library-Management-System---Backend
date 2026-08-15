# Backend — Agent Guide

Express 5 + TypeScript REST API. MySQL via **Prisma** (`prisma/schema.prisma`, 17 models — synced with `prisma db push`, **no migration files**). Redis (**ioredis**, connects eagerly at import in `src/helpers/redisClient.ts`). See root `../CLAUDE.md` for system-wide rules.

## Request flow

`server.ts` (listens :3000, starts node-cron) → `app.ts` (CORS, session, `/api-docs` Swagger, rate limiter, **auditMiddleware**, global error handler) → routers → controllers → services.

| Mount | Router file | Auth middleware |
|-------|-------------|-----------------|
| `/api/admin` | `src/routes/adminRoutes.ts` | `adminAuthMiddleware` per-route |
| `/api/books` | `src/routes/bookRoutes.ts` | mixed public/student |
| `/api/students` | `src/routes/studentRoutes.ts` | `studentAuthMiddleware` per-route |

- **Controllers** are thin: cast `req as RequestWithUser` / `RequestWithAdmin` (`src/helpers/interfaces.ts`), delegate to a service, map known error messages to status codes. Cast handlers `as RequestHandler` when TS complains in route files.
- **Services** (`src/services/*.service.ts`) are static-method classes owning all Prisma access.
- Auth: JWT Bearer; middleware caches the auth payload in Redis (7-day TTL). Student tokens carry `collegeCode`; admins carry `collegeId` — **scope every query by college**.
- Logging: Winston (`src/helpers/logger.ts`) — never `console.*`.

## Rules that prevent recurring bugs

1. **List endpoints return flattened DTOs** shaped for the consuming page (see `FineService.getCollegeFines`, `PurchaseService.getRequests`, `RenewalService.getCollegeRenewalRequests` as canonical examples) with `{ items, totalPages, totalCount }` envelopes. Never hand nested Prisma objects to the portals — this was the #1 bug class in this codebase.
2. **New admin mutation route ⇒ add an entry to `ACTION_MAP`** in `src/middlewares/auditMiddleware.ts`, or the action silently escapes the audit log.
3. **Notifications**: `NotificationService.createNotification(userId, title, message, category?)`. Category (`BorrowStatus | DueReminder | Overdue | Reservation | Renewal | Purchase`) gates on the user's `NotificationPreference` row; **omit category only for transactional must-deliver messages**. Gate emails with `NotificationService.isAllowed(userId, 'email', category)` (see `overdue.service.ts`).
4. **Fines**: `FineService.calculateFine` (₹10/day) + `applyFine` run inside the return-book transaction. Settlement is offline only: `recordPayment(fineId, collegeId, adminId, 'PAID'|'WAIVED', note?)` → `PATCH /api/admin/fines/:fineId/pay|/waive`. `User.fineBalance` is the aggregate; `Fine` rows are the ledger (`status PENDING/PAID/WAIVED`).
5. `BorrowedBook.dueDate` is nullable — guard everywhere.
6. Schema change ⇒ `npm run prisma` (db push, needs live MySQL) + `npm run build` regenerates the client. On dev machines without MySQL, build still works; db push must run at deployment.

## Jobs & integrations

- Cron: `src/jobs/overdueReminder.job.ts` — daily 08:00, `OverdueService.runAllReminders()` (due-soon within 2 days + overdue, in-app + email). Manual trigger: `POST /api/admin/overdue-reminders/trigger`.
- Email: `EmailService` (Nodemailer SMTP, fails gracefully if unconfigured).
- Files: ImageKit — server-side avatar upload (multer memory), book covers/PDFs via client tokens from `/imagekit-authentication-tokens`.
- Borrow limits by role in `borrow.service.ts`: FACULTY 10/30d, STAFF 5/21d, STUDENT 3/14d.

## Never put side effects inside a Prisma transaction

Prisma's interactive transactions time out after **5 seconds**, and this codebase has been bitten three separate times: a slow SMTP call inside signup's transaction rolled accounts back *after* replying 201, and notification/Redis work inside the return-book transaction made returns 500 and lose the fine.

Inside `$transaction`: database writes that must be atomic together, using the `tx` client. Outside (after commit): SMTP, Redis, notifications, and **the HTTP response**. `NotificationService` in particular runs on its own Prisma client, so calling it inside a transaction competes for a connection while that transaction holds one.

## Tests

| Command | What | Needs |
|---------|------|-------|
| `npm test` | 64 jest tests | nothing — `tests/setup.ts` mocks Redis (jest hangs on real ioredis; don't remove it), unit tests mock `../../src/helpers/prismaDb` per-file (mind the double `../`), logger mocks need `__esModule: true` |
| `npm run test:api` | 99 checks over all 73 endpoints, end-to-end | a running server + live MySQL/Redis. **Wipes the database** — dev only |

`scripts/api-smoke.js` creates every object through the public API, so it catches contract and transaction bugs unit tests cannot. It marks its three unavoidable direct-DB steps with `[DB]` (college provisioning, reading the emailed OTP, back-dating a due date to simulate time passing). Run it after any change to auth, borrowing, or fines.

## Book URLs are slugs

`Book.slug` is derived from the title and unique per college. Renaming a book
regenerates it and files the old value in `BookSlug`, so links shared before the
rename still resolve — `getBookDetails` tries current slug, then id, then
retired slugs, and returns `redirectTo` whenever the caller did not use the
canonical slug. Never delete `BookSlug` rows, and never let a new slug reuse a
retired one: that would silently point an old link at a different book.

Ids still work everywhere. After deploying this schema run
`node scripts/backfill-slugs.js` once to slug existing books.

## Logging

Requests flow through `requestIdMiddleware` + `requestLogger` (morgan → Winston): correlation id echoed as `X-Request-Id`, the acting admin/user, and severity by status (5xx error, 4xx warn). JSON in production plus rotating `logs/combined.log` and `logs/error.log`; readable one-liners in dev. Never `console.*`.

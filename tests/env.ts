/**
 * Environment defaults for the test run.
 *
 * `src/config.ts` validates the environment at import time and calls
 * process.exit(1) if anything required is missing — which kills the jest
 * worker outright, reported only as "Test suite failed to run". Any suite
 * that reaches config (the integration tests import app.ts, which imports it
 * transitively) therefore passed only on machines that happened to have a
 * Backend/.env sitting there. On a clean checkout — CI, or a new maintainer's
 * first `npm test` — it failed.
 *
 * Runs via jest's `setupFiles`, which is evaluated before test modules are
 * loaded. `setupFilesAfterEnv` is too late: imports at the top of setup.ts are
 * hoisted and would pull in config first.
 *
 * `??=` so a real environment (CI secrets, a developer's shell) still wins.
 * dotenv does not overwrite variables that are already set, so these also take
 * precedence over a local .env — which is the point: tests should not change
 * behaviour based on a file that is deliberately not in the repository.
 */

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'mysql://root:test@localhost:3306/lmstest';
process.env.JWT_SECRET ??= 'test-jwt-secret-not-a-real-one';
process.env.Session_Secret ??= 'test-session-secret-not-a-real-one';
process.env.REDIS_URL ??= 'redis://localhost:6379';

export {};

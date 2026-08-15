# Deployment

One box runs everything: MySQL, Redis, the API, and Caddy serving both portals
with automatic HTTPS. This is the demo instance today and the per-college
install later — same files either way, only `.env` changes.

## What you need

- A machine with Docker and the compose plugin. 2 vCPU / 4 GB RAM / 40 GB disk
  is comfortable; the whole stack idles under 1 GB.
- The three repos cloned **as siblings**, because the portals are built from
  this compose file:

  ```
  LibraryManagementSystem/
    Backend/   Admin/   Student/
  ```

- Two hostnames pointing at the machine. No domain yet? Use sslip.io — it
  resolves to the IP inside the name and still gets a real certificate:
  `library.203.0.113.5.sslip.io`.
- Ports 80 and 443 open. Nothing else needs to be.

## Install

```sh
cd Backend/deploy
cp .env.example .env          # fill it in — every value is explained there
docker compose -f docker-compose.prod.yml up -d --build
./bootstrap.sh                # schema, college row, first librarian
```

`bootstrap.sh` is safe to re-run; it skips whatever is already done.

## Upgrading

```sh
git -C ../..                  # pull all three repos first
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

**Dump the database before every upgrade.** This project uses `prisma db push`
with no migration files, so schema changes are applied by diffing against the
live database rather than by replaying reviewed steps. That is fine for a
fresh install and risky for a college with a year of loan history in it. Before
the first upgrade of a real install, baseline proper migrations.

## Backups

The `backup` service dumps the database nightly at 02:00 into `./backups`,
keeping 14 days. **Copy those files off the machine** — a backup on the same
disk is not a backup. Anything works: `rclone` to Drive, `scp` to another box.

Restore:

```sh
gunzip -c backups/lms-20260815-020000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" lmsbackend
```

Do this once on purpose, before you need it.

## How requests flow

```
https://library.<host>/          → Caddy → /srv/student   (SPA)
https://library.<host>/api/*     → Caddy → api:3000
https://admin.library.<host>/    → Caddy → /srv/admin     (SPA)
https://admin.library.<host>/api-docs → Swagger
```

Both portals are served from the same origin as their API calls, so CORS never
applies to them and `CORS_ORIGINS` can stay unset.

MySQL and Redis publish **no ports**. They are reachable on the compose
network and nowhere else. (`Backend/docker-compose.yml`, the development file,
does publish them — that one is for your laptop, never for a server.)

## Things that will bite you

- **The API must stay a single instance.** `overdueReminder.job.ts` schedules
  reminders in-process with node-cron. Two containers means every student gets
  every reminder twice. This also rules out serverless and autoscaling.
- **Verify SMTP before handing over.** Signup no longer fails when mail is
  down, so a broken mailer is silent: students simply never receive the code
  and cannot verify themselves. Send yourself a real signup.
- **`VITE_COLLEGE_CODE` is baked into the student build.** Changing the college
  code means rebuilding the `web` image, not editing a file on the server.
- **Log rotation.** Winston writes to the `api-logs` volume in production.
  Check it occasionally, or add rotation, before it fills the disk.

## Demo instance

For a sales demo, seed realistic data after bootstrap:

```sh
API_BASE_URL=https://library.<host> COLLEGE_CODE=<CODE> \
  ADMIN_EMAIL=... ADMIN_PASS=... bash ../scripts/seed-demo.sh
```

It builds everything over the public API — books, students, loans, returns,
fines, reviews and pending approvals — so the portals look like a library in
use rather than an empty shell. Never point it at a real college install: it
assumes it can create whatever it likes.

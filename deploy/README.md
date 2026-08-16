# Deployment

One box runs everything: MySQL, Redis, the API, and Caddy serving both portals
with automatic HTTPS. This is the demo instance today and the per-college
install later — same files either way, only `.env` changes.

**Nothing is built on your machine, and nothing is built on the server.**
GitHub Actions builds three images and pushes them to GHCR; the server pulls
them. The Vite builds are by far the heaviest thing in this project, and they
belong on a runner with real memory rather than a laptop or a 1 GB VM.

```
Backend  repo --push--> Actions --> ghcr.io/<owner>/lms-api
Admin    repo --push--> Actions --> ghcr.io/<owner>/lms-admin      (carries /dist only)
Student  repo --push--> Actions --> ghcr.io/<owner>/lms-student    (carries /dist only)
                                          |
                              server: docker compose pull && up -d
```

## One-time setup

**1. Tell the portal repos which college they are for.** In *each* of the Admin
and Student repos: Settings → Secrets and variables → Actions → Variables →
New variable → `VITE_COLLEGE_CODE` = e.g. `GICCL`. They fail loudly without it,
because a portal built without a college code sends the wrong one on every
request and every login fails.

**2. Push all three repos.** Each publishes its image. Watch the Actions tab.

**3. Make the packages readable by the server.** GHCR packages are private by
default. Either set each package to public (fine — the images hold no
secrets), or create a read-only token and `docker login ghcr.io` on the server.

**4. Provision a machine.** Anything with Docker and 1 GB RAM. Ports 80 and
443 open; nothing else needs to be.

**5. Point two hostnames at it.** No domain yet? sslip.io resolves to the IP
inside the name and still gets a real certificate:
`library.203.0.113.5.sslip.io`.

## Install

Copy three files to the server — `docker-compose.ghcr.yml`, `Caddyfile`,
`bootstrap.sh` — plus a filled-in `.env`. No source checkout is needed.

```sh
cp .env.example .env          # fill it in; every value is explained there
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
./bootstrap.sh                # schema, college row, first librarian
```

`bootstrap.sh` is safe to re-run; it skips whatever is already done.

## Upgrading

```sh
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
docker compose -f docker-compose.ghcr.yml --profile tools run --rm migrate
```

Roll back by pinning `IMAGE_TAG` in `.env` to a short commit SHA — every build
is tagged with one — then `pull && up -d` again.

**Dump the database before every upgrade.** This project uses `prisma db push`
with no migration files, so schema changes are applied by diffing against the
live database rather than replaying reviewed steps. Fine for a fresh install,
risky for a college with a year of loan history. Before the first upgrade of a
real install, baseline proper migrations.

## Building on the server instead

`docker-compose.prod.yml` builds everything from source on the machine it runs
on. It needs all three repos cloned as siblings and enough RAM for two Vite
builds (2 GB minimum, 4 GB comfortable), which is exactly why the GHCR path is
the default. Use it for an air-gapped install:

```sh
COMPOSE_FILE_NAME=docker-compose.prod.yml ./bootstrap.sh
```

## Backups

The `backup` service dumps the database nightly at 02:00 into `./backups`,
keeping 14 days. **Copy those files off the machine** — a backup on the same
disk is not a backup. `rclone` to Drive, `scp` to another box, anything.

Restore:

```sh
gunzip -c backups/lms-20260815-020000.sql.gz | \
  docker compose -f docker-compose.ghcr.yml exec -T mysql \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" lmsbackend
```

Do this once on purpose, before you need it.

## How requests flow

```
https://library.<host>/                → Caddy → /srv/student   (SPA)
https://library.<host>/api/*           → Caddy → api:3000
https://admin.library.<host>/          → Caddy → /srv/admin     (SPA)
https://admin.library.<host>/api-docs  → Swagger
```

Both portals are served from the same origin as their API calls, so CORS never
applies to them and `CORS_ORIGINS` can stay unset.

The portal images carry nothing but `/dist`. Two one-shot containers unpack
them into a volume that the single Caddy serves, then exit — one web server
and one Caddyfile owning all routing, instead of a server per portal.

MySQL and Redis publish **no ports**. They are reachable on the compose network
and nowhere else. (`Backend/docker-compose.yml`, the development file, does
publish them — that one is for your laptop, never a server.)

## Fitting 1 GB of RAM

The compose file already tunes for this: MySQL's buffer pool is capped at
128 MB and `performance_schema` is off, which alone saves roughly 200 MB.
Add swap on a small VM, it costs nothing and prevents the OOM killer from
taking MySQL out at 3am:

```sh
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Things that will bite you

- **The API must stay a single instance.** `overdueReminder.job.ts` schedules
  reminders in-process with node-cron. Two containers means every student gets
  every reminder twice. This also rules out serverless and autoscaling.
- **Redis runs `noeviction` on purpose.** It holds email verification codes
  (`user:<id>:code`), not just cache. An LRU policy would silently discard
  them and students would never be able to verify.
- **Verify SMTP before handing over.** Signup no longer fails when mail is
  down, so a broken mailer is silent: the code never arrives. Send yourself a
  real signup.
- **`VITE_COLLEGE_CODE` is baked into both portal bundles.** Changing the
  college means rebuilding those images, not editing a file on the server.
- **Log rotation.** Winston writes to the `api-logs` volume in production.
  Check it occasionally before it fills the disk.

## Demo data

For a sales demo, seed after bootstrap:

```sh
API_BASE_URL=https://library.<host> COLLEGE_CODE=<CODE> \
  ADMIN_EMAIL=... ADMIN_PASS=... bash scripts/seed-demo.sh
```

It builds everything over the public API — books, students, loans, returns,
fines, reviews, pending approvals — so the portals look like a library in use
rather than an empty shell. Never point it at a real college install.

# Local infrastructure

Local development dependencies that don't run inside the Next.js
process. Everything here is **dev-only** — production runs on a
managed Postgres + S3 + SES and does not touch any file in this
directory.

## Stack

| Service | Task    | What it does                                                   |
| ------- | ------- | -------------------------------------------------------------- |
| `db`    | T0-3-8  | PostgreSQL 16 with `citext` extension (auto-enabled by Prisma) |
| `minio` | T0-5-3  | S3-compatible object store for KYC, projects, certs, exports   |
| `caddy` | T0-11-1 | Local TLS-terminating reverse proxy in front of `web:3000`     |

(T0-5-3 and T0-11-1 are added to `docker-compose.yml` by their own
tasks; this README documents the _final_ shape.)

## Bring it up

From the repo root:

```bash
docker compose -f infra/docker-compose.yml up -d db
# wait for the healthcheck (~5s)
docker compose -f infra/docker-compose.yml ps
#   ccverse-postgres   ...   Up (healthy)
```

The connection string matches the root `.env.example`:

```
DATABASE_URL=postgresql://ccverse:ccverse@localhost:5432/ccverse?schema=public
```

## Run migrations

```bash
npm run db:migrate        # dev: create + apply a new migration
npm run db:migrate:deploy # prod-style: apply pending migrations only
npm run db:reset          # nuke + remigrate + reseed
```

## Tear it down

```bash
docker compose -f infra/docker-compose.yml down       # stop, keep volume
docker compose -f infra/docker-compose.yml down -v    # stop, delete volume
```

`down -v` destroys all local data. Prefer `npm run db:reset` for
schema iteration — it keeps the container up and reuses the volume.

## Notes

- The DB is bound to `127.0.0.1:5432`, not `0.0.0.0`. Other containers
  on the same Docker network can still reach it via the service name
  `db:5432`.
- Credentials (`ccverse` / `ccverse`) are dev-only and match the
  committed `.env.example`. Never reuse them outside local dev.
- The named volume `ccverse-postgres-data` survives `down` but is
  removed by `down -v` or `docker volume rm ccverse-postgres-data`.

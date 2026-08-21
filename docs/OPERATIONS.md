# Operations

## Process checklist (laptop)

| Process | How you know it is up |
| --- | --- |
| Docker Desktop | `docker info` succeeds |
| Postgres | `docker exec netmon-postgres-1 pg_isready -U nms -d nms` |
| Redis | port 6379 |
| Next.js | http://localhost:3000 |
| Worker | terminal log `[NETMON poller] worker started` |

## Common failures

### `This site can't be reached` / `ERR_FAILED` on :3000

`npm run dev` is not running. Start it from the repo root.

### Login: “Email atau password salah.”

Often **Postgres is down**, not a wrong password. NextAuth cannot read `user`. Start Docker Compose, then retry `admin@netmon.click` / `ChangeMeNow!`.

The login form also shows **Database is unreachable** when Prisma cannot connect.

### Prisma `Can't reach database server at 127.0.0.1:5432`

```bash
open -a Docker
docker compose -f docker-compose.dev.yml up -d
```

### Prisma `Unknown arg` / missing `notification` / `tickets`

Client is stale vs `schema.prisma`.

```bash
npx prisma migrate deploy
npx prisma generate
```

Restart Next.js. `lib/prisma.ts` busts the dev singleton when the generation stamp changes.

### Notification bell `TypeError: Failed to fetch`

Usually HMR or a brief API blip. The bell swallows fetch errors; refresh if an old overlay remains.

### Agent `{"error":"Unknown agent"}`

`--token=` was a placeholder (`TOKEN_DARI_KARTU`) or an old token after **Issue token** rotated it. Copy the install command from `/dashboard/agents` (hex + `--url=`). See [AGENT.md](AGENT.md).

### NovaCRM Test connection OK but no remote ticket number

Connector enabled but auto-open ran **before** the secret was saved. Open again from Alerts, or fire a new alert. Local stubs may have empty `external_id`.

### NovaCRM `Unauthorized webhook`

Alert secret in NETMON ≠ Alert secret on NovaCRM **Other** card, or secret shorter than 16 characters / on the weak list.

### Inbound from NovaCRM never arrives

`APP_URL` is localhost. Deploy or tunnel NETMON; update `APP_URL` and `NEXTAUTH_URL`.

## Migrations

Apply in order under `prisma/migrations/` (`0001_init` … `0009_ticker`). Production (via **worker** on the cloud image):

```bash
npx prisma migrate deploy
```

Do not `db push` over a migrated cloud database.

## Backup (Postgres)

```bash
docker exec netmon-postgres-1 pg_dump -U nms nms > netmon-$(date +%Y%m%d).sql
```

Restore only onto an empty or dedicated instance.

## Logs

- Next.js: the `npm run dev` / `next start` terminal
- Poller: worker stdout
- Prisma: `error` / `warn` in development

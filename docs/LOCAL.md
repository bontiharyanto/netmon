# Local laptop

Run NETMON on a developer machine. Cloud NovaCRM (`novacrm.click`) can still receive tickets from this laptop. NovaCRM **cannot** call back into `localhost`.

## Requirements

- Node.js 20+
- npm
- Docker Desktop (Postgres 16 + Redis 7)
- Ports **3000**, **5432**, **6379** free

## First run

```bash
git clone https://github.com/bontiharyanto/netmon.git
cd netmon
cp .env.example .env
```

For laptop, set these in `.env` (do not commit the file):

```
DATABASE_URL=postgresql://nms:changeme@127.0.0.1:5432/nms
REDIS_URL=redis://127.0.0.1:6379
NEXTAUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
IS_SAAS=false
```

Then:

```bash
# 1. Start Docker Desktop, then:
docker compose -f docker-compose.dev.yml up -d

# 2. App
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Optional poller (alerts + auto-tickets):

```bash
npm run worker
```

## Seed logins

Password for all seed users: `ChangeMeNow!` (override with `SEED_ADMIN_PASSWORD` **before** seed).

| Email | Role | Lands on |
| --- | --- | --- |
| `admin@netmon.click` | superadmin | `/dashboard` |
| `admin@demo.netmon.click` | admin | `/dashboard` |
| `operator@demo.netmon.click` | operator | `/dashboard` |
| `viewer@demo.netmon.click` | viewer | `/portal` |
| `admin@acme.netmon.click` | admin | `/dashboard` |
| `admin@jakarta.netmon.click` | admin | `/dashboard` |

`npm run db:seed` wipes tenant data and recreates demo inventory. Do not seed a production database.

## Daily start

Docker Desktop must be running or Postgres is unreachable and login looks like a bad password.

```bash
docker compose -f docker-compose.dev.yml up -d
npm run dev
```

## What works from a laptop

| Direction | Works? |
| --- | --- |
| Browser → `localhost:3000` | Yes |
| NETMON → `https://novacrm.click` (open ticket / sync CMDB) | Yes, if the laptop has internet |
| NovaCRM / internet → NETMON inbound webhook | **No** — `APP_URL` is localhost |
| Tenant subdomain `demo.netmon.click` | Only after cloud DNS + Traefik |

Inbound URL shown in Settings is `http://localhost:3000/api/tickets/inbound/{token}`. That is only useful on the same machine. For two-way ticketing, deploy NETMON or expose it with a tunnel and set `APP_URL` / `NEXTAUTH_URL` to that public origin.

## After schema changes

```bash
npx prisma migrate deploy
npx prisma generate
```

Restart `npm run dev` if Prisma Client looks stale (`Unknown arg`, missing model).

## Stop

```bash
# Ctrl+C the Next.js process
docker compose -f docker-compose.dev.yml stop
```

Data stays in the Docker volume `postgres_data`.

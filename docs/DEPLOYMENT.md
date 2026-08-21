# Deployment

One codebase. Cloud and on-premise expose the same product. The edge and `IS_SAAS` differ.

## Cloud SaaS

File: `docker-compose.cloud.yml`

| Item | Value |
| --- | --- |
| Product | https://netmon.click |
| Tenant | `https://{slug}.netmon.click` |
| Host | `103.190.214.224` |
| Edge | Traefik v3 + Let’s Encrypt wildcard `*.netmon.click` |
| `IS_SAAS` | `true` |

### DNS (Cloudflare / registrar)

```
A      @      103.190.214.224
A      *      103.190.214.224
CNAME  www    netmon.click
```

Wait for propagation (about five minutes). Firewall: **80**, **443**.

On a **dedicated** host with free 80/443, Compose starts Traefik. On a **shared** VPS (port 80 already taken), keep NETMON on **3008** and put Nginx or the existing Traefik in front — see [deploy/EDGE.md](../deploy/EDGE.md).

### Server

```bash
git clone https://github.com/bontiharyanto/netmon.git
cd netmon
cp .env.example .env
# fill production secrets — never commit .env

docker compose -f docker-compose.cloud.yml up -d --build
docker compose -f docker-compose.cloud.yml exec web npx prisma migrate deploy
```

Seed only on a **new** empty database:

```bash
docker compose -f docker-compose.cloud.yml exec web npm run db:seed
```

Verify https://netmon.click and https://demo.netmon.click.

`NEXTAUTH_URL` and `APP_URL` must be `https://netmon.click` so auth cookies and inbound webhooks are public.

## On-premise

File: `docker-compose.onprem.yml`

No Traefik. The app listens on **3000**.

```bash
cp .env.example .env
```

Set:

```
IS_SAAS=false
NEXTAUTH_URL=https://nms.perusahaan.com
APP_URL=https://nms.perusahaan.com
```

```bash
docker compose -f docker-compose.onprem.yml up -d --build
docker compose -f docker-compose.onprem.yml exec web npx prisma migrate deploy
```

Put TLS in front of port 3000 (customer reverse proxy or load balancer). Do not send tenant data to netmon.click unless the customer agrees.

On-prem still uses `tenant_id` (single default tenant).

## Environment contract

See `.env.example`. Required:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Queues / poller |
| `JWT_SECRET` | App tokens |
| `ENCRYPT_KEY` | Channel and connector secrets at rest |
| `NEXTAUTH_SECRET` | Session |
| `NEXTAUTH_URL` | Auth origin |
| `APP_URL` | Canonical URL (inbound webhooks, agent script) |
| `IS_SAAS` | `true` / `false` |
| `SERVER_IP` | Cloud host (optional on-prem) |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | Optional LLM |

Never commit `.env`, `.env.production`, or Traefik `acme.json`.

## Worker

The `worker` service in both compose files runs `npm run worker` (BullMQ poll every 60s). If you run only `npm run dev` on a laptop, start the worker in a second terminal for live device checks.

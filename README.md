# NETMON

**Your Network, Always On.**

Enterprise Network Monitoring System for **Cloud SaaS** and **on-premise**. One codebase. Dark-mode NOC, customer portal, ticketing (including [NovaCRM](https://novacrm.click)), and tenant isolation.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)

| | |
| --- | --- |
| **Product** | [netmon.click](https://netmon.click) |
| **Tenant URL** | `{slug}.netmon.click` |
| **Docs** | [docs/README.md](docs/README.md) |
| **Tagline** | Click to Monitor Everything · Enterprise Network Visibility |

---

## Documentation

| Guide | Contents |
| --- | --- |
| [Local laptop](docs/LOCAL.md) | Docker Postgres, seed, `localhost:3000` |
| [Deployment](docs/DEPLOYMENT.md) | Cloud Traefik **or** shared VPS + Caddy |
| [Shared VPS](deploy/EDGE.md) | `netmon.click` behind WorkPulse Caddy (port 3008) |
| [Architecture](docs/ARCHITECTURE.md) | Poller, tenancy, layout |
| [RBAC](docs/RBAC.md) | Roles, portal vs NOC |
| [User guide](docs/USER-GUIDE.md) | Daily console |
| [Ticketing](docs/TICKETING.md) | Helpdesk, NovaCRM, Jira |
| [Channels](docs/CHANNELS.md) | Notify + Reply-To |
| [AI](docs/AI.md) | Rules / local LLM / cloud |
| [Agents](docs/AGENT.md) | Heartbeat enroll |
| [API](docs/API.md) | Routes |
| [Operations](docs/OPERATIONS.md) | Incidents and Prisma |

---

## Features

| Module | Path | Description |
| --- | --- | --- |
| Poller | worker | TCP check, metrics, auto-alert |
| Alerts | `/dashboard/alerts` | Firing / resolved |
| Tickets | `/dashboard/tickets` | Local helpdesk + remote ITSM |
| SLA | `/dashboard/sla` | 30-day uptime |
| Topology | `/dashboard/topology` | Live map + file upload |
| Import | `/dashboard/import` | CSV / Excel |
| Bulk | `/dashboard/devices` | Multi-select |
| Reports | `/dashboard/reports` | PDF |
| Status page | `/status/[tenant]` | Public |
| Security | `/dashboard/security` | TOTP 2FA, idle timeout |
| Account | `/dashboard/account` | Change own password |
| Agents | `/dashboard/agents` | Token + heartbeat |
| Boards | `/dashboard/dashboards` | Widget layouts |
| Portal | `/portal` | Read-only customer console |
| Users | `/dashboard/users` | Invite + roles |
| Signup | `/signup` | New tenant |
| Superadmin | `/admin` | Platform |
| CMDB | `/dashboard/cmdb` | Configuration items |
| AI | `/dashboard/ai` | Copilot + insights |
| Channels | `/dashboard/settings` | Email, Slack, WhatsApp, … |
| Ticketing | `/dashboard/settings/tickets` | NovaCRM, Jira, ServiceNow, … |

---

## Quick start (local)

Requires Node 20+, Docker Desktop, and npm. Full notes: [docs/LOCAL.md](docs/LOCAL.md).

```bash
git clone https://github.com/bontiharyanto/netmon.git
cd netmon
cp .env.example .env
# set DATABASE_URL to 127.0.0.1 and NEXTAUTH_URL=http://localhost:3000

docker compose -f docker-compose.dev.yml up -d
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

| Account | Email | Password | Role |
| --- | --- | --- | --- |
| Console | `admin@netmon.click` | `ChangeMeNow!` | superadmin |
| Portal | `viewer@demo.netmon.click` | `ChangeMeNow!` | viewer |

Change these before any public deploy. Keep Docker Desktop running or login will fail.

Poller (second terminal):

```bash
npm run worker
```

---

## Cloud SaaS

DNS `A @` and `A *` → `103.190.214.224`. This VPS already uses WorkPulse Caddy on 80/443 — do not start a second Traefik. Runbook: [deploy/EDGE.md](deploy/EDGE.md).

```bash
export COMPOSE_BAKE=false
docker compose -f docker-compose.cloud.yml build --progress=plain worker
docker compose -f docker-compose.cloud.yml build --progress=plain web
docker compose -f docker-compose.cloud.yml -f deploy/docker-compose.caddy.yml up -d postgres redis web worker
docker compose -f docker-compose.cloud.yml exec worker npx prisma migrate deploy
```

Also: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## License

Proprietary. All rights reserved by the NETMON project.

**NETMON** — Enterprise Network Visibility · [netmon.click](https://netmon.click)

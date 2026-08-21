# API

All tenant APIs require a NextAuth session cookie unless noted. Writes check RBAC. Viewer is read-only.

Base: `{APP_URL}` (local `http://localhost:3000`).

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| Credentials | `/api/auth/[...nextauth]` | Email + password; TOTP if enabled |
| POST | `/api/signup` | Create tenant + admin |

Login errors: wrong password vs `OTP_REQUIRED` vs `DATABASE_UNAVAILABLE` (Postgres down).

## Inventory and monitoring

| Method | Path | Permission |
| --- | --- | --- |
| GET/POST | `/api/devices` | assets |
| POST | `/api/devices/bulk` | bulk.actions |
| GET | `/api/alerts` | alert.read |
| POST | `/api/alerts` | alert.write |
| GET | `/api/dashboard/overview` | session |
| GET | `/api/cmdb` | cmdb |
| POST | `/api/import` | import.inventory |
| POST | `/api/topology/import` | topology.write |
| GET | `/api/topology/template` | topology.read |
| GET | `/api/reports` | reports.export |

## Ticketing

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST/PATCH/DELETE | `/api/tickets/connectors` | channels.manage |
| POST | `/api/tickets/connectors/test` | Test remote ITSM |
| GET | `/api/tickets/connectors/available` | For “open ticket” on alerts |
| GET/POST | `/api/tickets` | List / open from alert |
| GET/PATCH | `/api/tickets/{id}` | Detail |
| POST | `/api/tickets/{id}/comment` | Comment / close |
| POST | `/api/tickets/inbound/{token}` | **No session** — ITSM webhook |

NovaCRM outbound (server-side, not a public NETMON route):  
`POST {novacrm}/api/v1/t/{slug}/webhooks/alerts` with `x-webhook-secret`.

## Notify and inbox

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST/PATCH | `/api/channels` | channels.manage |
| POST | `/api/channels/test` | |
| POST | `/api/notify/inbound` | Email reply ingest |
| GET/PATCH | `/api/notifications` | Bell |

## AI, users, security, agents

| Method | Path |
| --- | --- |
| POST | `/api/ai/ask` |
| GET | `/api/ai/insights` |
| GET/PUT | `/api/ai/settings` |
| GET/POST | `/api/users` |
| POST | `/api/security/2fa` · `/api/security/2fa/confirm` |
| GET/POST | `/api/agents` |
| POST | `/api/agent/heartbeat` (token, no session) |
| GET/POST | `/api/dashboards` |

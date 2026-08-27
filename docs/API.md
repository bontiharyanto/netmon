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
| GET/POST | `/api/devices` | assets · create may set `display_name`, `checks`, `skip_poller_when_agent` |
| PATCH | `/api/devices/{id}` | assets.write · city / checks / SNMP (community write-only, masked on read) |
| GET | `/api/devices/{id}/checks` | assets.read · recent check samples (latency history) |
| GET/POST | `/api/snmp/profiles` | assets · system + tenant OID profiles |
| PATCH/DELETE | `/api/snmp/profiles/{id}` | assets.write · tenant profiles only |
| POST | `/api/devices/bulk` | bulk.actions |
| GET | `/api/alerts` | alert.read |
| POST | `/api/alerts` | alert.write |
| GET/POST | `/api/alert-rules` | alert · CRUD rules (default `device_down` auto-seeded) |
| PATCH/DELETE | `/api/alert-rules/{id}` | alert.write |
| GET/POST | `/api/maintenance` | alert · maintenance windows (`?active=1`) |
| PATCH/DELETE | `/api/maintenance/{id}` | alert.write |
| GET | `/api/maintenance/active` | alert.read · windows active now |
| GET | `/api/dashboard/overview` | session |
| GET/PATCH/DELETE | `/api/cmdb/{id}` | cmdb.write |
| GET/POST | `/api/cmdb/relations` | cmdb · App/Server/DB graph |
| DELETE | `/api/cmdb/relations/{id}` | cmdb.write |
| GET/POST | `/api/floors/buildings` | assets · buildings for floor plans |
| POST | `/api/floors` | assets.write · create floor |
| GET/PATCH/DELETE | `/api/floors/{id}` | assets · floor + placements |
| GET/POST/DELETE | `/api/floors/{id}/image` | assets · JPG/PNG/WebP ≤8MB |
| POST | `/api/floors/{id}/placements` | assets.write · pin device (x%, y%, optional rack/zone) |
| PATCH/DELETE | `/api/floors/placements/{id}` | assets.write · move and/or rack/zone |
| PATCH/DELETE | `/api/cmdb/{id}` | cmdb.write |
| POST | `/api/import` | import.inventory |
| POST | `/api/topology/import` | topology.write |
| GET | `/api/topology/template` | topology.read · `?format=csv\|xlsx\|pdf` filled from live links |
| GET | `/api/reports` | reports.export · `?from&to&template=operations\|inventory\|alerts\|tickets\|sla&city&type&status&severity&format=json\|pdf\|xlsx\|csv` · file exports audited |
| GET | `/api/reports/meta` | reports.export · filter facets (cities, types, statuses) + templates |

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
CMDB: `POST {novacrm}/api/v1/t/{slug}/webhooks/cmdb` (same secret). Operator notes: [CMDB.md](CMDB.md).

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
| GET/POST | `/api/users` | users.manage |
| PATCH/DELETE | `/api/users/{id}` | users.manage · cannot delete self / last admin |
| GET/PUT/POST | `/api/admin/capabilities` | platform.admin · Capability Matrix |
| POST | `/api/security/2fa` · `/api/security/2fa/confirm` |
| GET/PATCH | `/api/security/session` | Idle timeout + password rotation days |
| PATCH | `/api/account/password` | Own password; resets 30-day clock |
| GET | `/api/ops/outage` | Mass-incident ticker payload |
| PATCH | `/api/ops/outage` | alert.write · custom running text |
| GET/POST | `/api/agents` |
| POST | `/api/agent/heartbeat` (token, no session) |
| GET/POST | `/api/dashboards` |

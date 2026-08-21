# RBAC

Roles are enforced in UI navigation and API writes. A viewer who opens `/dashboard` is redirected to `/portal`.

## Roles

| Role | Who | Home |
| --- | --- | --- |
| `superadmin` | NETMON platform | `/dashboard` + `/admin` |
| `admin` | Tenant owner | `/dashboard` |
| `operator` | NOC | `/dashboard` |
| `viewer` | Customer | `/portal` |

## Permission matrix

| Permission | superadmin | admin | operator | viewer |
| --- | --- | --- | --- | --- |
| assets / cmdb / topology / sla / alert **read** | Y | Y | Y | Y (portal) |
| assets / cmdb / topology / alert **write**, bulk, import | Y | Y | Y | N |
| ai.use | Y | Y | Y | Y (own tenant) |
| kb.read | Y | Y | Y | Y (portal published) |
| kb.write | Y | Y | Y | N |
| ai.manage | Y | Y | N | N |
| users.manage / security.manage | Y | Y | N | N |
| channels.manage (notify + ticketing) | Y | Y | N | N |
| dashboard.builder / reports.export / agent.enroll | Y | Y | Y | N |
| platform.admin | Y | N | N | N |

Write APIs return **403** for viewer. Writes are audited (`audit_log`).

## Portal vs NOC

Portal is a mirror. NOC is the controls.

Portal **does** show: inventory, CMDB, topology, tickets (read), published knowledge, AI summary, firing alerts (no ack/resolve).

Portal **does not** allow: add/delete devices, bulk, import, users, agent tokens, dashboard builder, topology edit, commands to devices.

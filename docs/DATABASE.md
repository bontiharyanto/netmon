# Database

PostgreSQL 16 via Prisma. Tenant isolation is `where: { tenant_id }` on every tenant query.

## What is already indexed

Most tables have `tenant_id`. Also:

| Table | Index | Why |
| --- | --- | --- |
| `device` | unique `(tenant_id, hostname)`, unique `ip` | Enroll / import |
| `device` | `(tenant_id, status)` | Overview / mass-outage counts |
| `alert` | `device_id`, `(device_id, event, status)`, `(tenant_id, status)` | Poller `device_down` + firing lists |
| `metric` | `(device_id, ts)` | Charts |
| `agent` | unique `token`, unique `device_id` | Heartbeat lookup |
| `ticket` | `(tenant_id, status)` | Inbox |
| `notification` | `(user_id, read_at)`, `(tenant_id, created_at)` | Bell |
| `kb_article` | `(tenant_id, published)` | Portal KB |

Migration: `0010_query_indexes`.

## What is not “fully optimized” yet

- **Poller** loads every device in the database each minute (`pollAllDevices`), not batched by tenant. Fine for hundreds of devices, not for tens of thousands.
- **Metrics grow forever** — no retention / Timescale / rollup. `metric` will be the largest table.
- Prisma uses a default connection pool (no PgBouncer in compose).
- Poller TCP port is fixed; no extra tables.

For production at current demo size (dozens of devices), the indexes above are the right next step. Retention jobs would be the next one if metrics volume grows.

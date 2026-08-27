# Multi-check probes & CMDB relations (P1)

## Device checks

Each inventory device has a `checks` JSON field:

```json
{ "tcp": [80, 443], "http": [{ "url": "https://app.example/health", "expectStatus": 200 }], "icmp": false }
```

| Check | Meaning |
| --- | --- |
| `tcp` | Connect to `device.ip:port` (up to 16 ports) |
| `http` | GET URL; status must match `expectStatus` (default 200) |
| `icmp` | Best-effort `ping` (may fail in locked-down containers) |

**Status roll-up**

| Result | Status |
| --- | --- |
| All checks pass | `up` |
| Some pass | `degraded` |
| All fail | `down` (or `degraded` if agent heartbeat &lt; 3 minutes) |

Defaults by type: database→5432, application/service→443, server→80+443, else→80.

UI: Inventory create form + per-row **Checks**. Agent heartbeat still forces `up` and resolves `device_down`.

## CMDB relations

`cmdb_relation` links CIs: `runs_on`, `depends_on`, `connects_to`, `hosts`, `backed_by`.

Example: Application **runs_on** Server, Application **backed_by** Database.

UI: CMDB → **CI relations**. API: `GET/POST /api/cmdb/relations`, `DELETE /api/cmdb/relations/{id}`.

## Migration

`0015_device_checks_cmdb_relation` — rebuild **worker** (poller) and **web**, then:

```bash
docker compose -f docker-compose.cloud.yml exec worker npx prisma migrate deploy
```

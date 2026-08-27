# Multi-check probes & CMDB relations

## Device checks (P1)

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

## Services & check history (P2)

| Feature | Detail |
| --- | --- |
| Services UI | `/dashboard/services` — devices typed `application` / `service`; display name, latency, skip-when-agent |
| Portal | `/portal/services` + Assets columns for checks / latency (read-only) |
| Latency | Poller stores average ms on `device.last_check_latency_ms` |
| History | `device_check_result` samples (kept ~100 per device); `GET /api/devices/{id}/checks` |
| Skip poller | `skip_poller_when_agent=true` skips TCP/HTTP/ICMP while agent heartbeat is fresh (&lt;3 min) |

## CMDB relations

`cmdb_relation` links CIs: `runs_on`, `depends_on`, `connects_to`, `hosts`, `backed_by`.

Example: Application **runs_on** Server, Application **backed_by** Database.

UI: CMDB → **CI relations**. Portal `/portal/cmdb` shows relations read-only.  
API: `GET/POST /api/cmdb/relations`, `DELETE /api/cmdb/relations/{id}`.

## Migrations

`0015_device_checks_cmdb_relation` · `0016_p2_services_checks_rack` — rebuild **worker** (poller) and **web**, then:

```bash
docker compose -f docker-compose.cloud.yml exec worker npx prisma migrate deploy
```

# SNMP GET poll (P3b)

SNMP **GET** from the worker poller — not trap ingest, not the Settings channel type `snmp` (outbound trap stub).

## Device fields

| Field | Notes |
| --- | --- |
| `snmp_enabled` | When true and a profile is set, poller GETs OIDs after reachability checks |
| `snmp_version` | `v2c` (polled). `v3` stored but not polled yet |
| `snmp_community` | Encrypted at rest (`ENCRYPT_KEY`). API returns masked `••••••••` |
| `snmp_port` | Default 161 |
| `snmp_profile_id` | System or tenant profile |
| `snmp_last_error` / `snmp_last_at` | Last poll outcome (no secrets) |

Reachability (TCP/HTTP/ICMP) still owns up/down. SNMP failure does **not** force `device_down`.

## Profiles

| Kind | `tenant_id` | Editable |
| --- | --- | --- |
| System | `null` | No |
| Tenant | set | Yes (`assets.write`) |

System seeds:

1. **Host CPU (HR-MIB)** — `hrProcessorLoad.1` → `cpu_percent`
2. **IF-MIB basics** — ifIn/OutOctets + ifOperStatus (ifIndex 1) → `metric_extra`

API: `GET/POST /api/snmp/profiles`, `PATCH/DELETE /api/snmp/profiles/{id}`.

## Metrics

Poll order: agent (&lt;90s) → SNMP (if enabled) → synthetic jitter.

`metric.metric_extra` holds custom OID keys + `__source` (`snmp` \| `jitter` \| …).

Alert event `snmp_threshold`: config `{ "oid_key": "ifOperStatus", "op": ">", "value": 1 }`.

## UI

Inventory → row **SNMP**. Portal Assets shows SNMP on/off only.

## Migration

`0018_p3b_snmp` — rebuild **web + worker**, then `prisma migrate deploy`.

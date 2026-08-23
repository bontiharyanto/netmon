# CMDB

Configuration items live in NETMON. Operators maintain them on `/dashboard/cmdb`. The customer portal `/portal/cmdb` is read-only.

Related: [Ticketing](TICKETING.md) (NovaCRM connector) · [User guide](USER-GUIDE.md) · [RBAC](RBAC.md)

## Records

Each CI has name, type (`hardware`, `circuit`, `software`, `license`, `site`, or a custom value), optional asset tag / serial / owner / location, status (`in_service`, `maintenance`, `retired`, `outage`), and an optional link to an Inventory device.

Admin and operator can add, edit, and delete. Viewer cannot write.

## NovaCRM sync (v1)

When a **NovaCRM** connector is enabled and **Sync CMDB** is on, NETMON **pushes** CIs to [novacrm.click](https://novacrm.click). Direction is **NETMON → NovaCRM only**. Creating a CI in the NovaCRM desk does not create a row in NETMON.

NovaCRM stores an **asset** (ITAM) and a **CI** (graph). NETMON sends both in one webhook. Tickets still use a different path (`/webhooks/alerts`).

### Prerequisites

1. NovaCRM **Other** card has an Alert secret (≥ 16 characters). Same secret as tickets. No new plugin.
2. NovaCRM image includes channel `cmdb`. Confirm OpenAPI for the tenant lists `cmdb` in `/webhooks/{channel}`, or Test connection in NETMON shows **CMDB sync ready**.
3. NETMON connector: **Add NovaCRM**, Base URL `https://novacrm.click`, tenant slug (lab `novacrm-demo`), the same Alert secret, **Enable connector**, **Sync CMDB**.
4. **NovaCRM account UUID** empty → tenant **Internal** account. Fill only if CIs must land on another NovaCRM account.

**Save**, then **Test connection**. Wanted result: `NovaCRM tenant {slug} reachable · CMDB sync ready`.

| Test message | Meaning |
| --- | --- |
| `… · CMDB sync ready` | Channel live. Create a CI to verify. |
| `… · CMDB channel not deployed yet` | Tenant health OK; pull/restart NovaCRM web image. |
| `… reachable` only | Stale last test, or ping failed with a status other than 200/404. Test again. |
| `Unauthorized webhook` on create | Secret on NETMON does not match NovaCRM **Other**. |

The inbound webhook URL on the connector form is **not** used for CMDB. That URL is ticket comments NovaCRM → NETMON.

### What is sent

`POST {base}/api/v1/t/{slug}/webhooks/cmdb`  
Headers: `x-webhook-secret`, `X-Tenant-Id: {slug}`.

| NETMON CI | NovaCRM asset | NovaCRM CI |
| --- | --- | --- |
| name | name | name |
| type | mapped type (`hardware` → `server`, circuit/network → `network`, …) | type as stored |
| asset tag (or `NETMON-{id}`) | unique `assetTag` | — |
| serial, location, owner | serial, location, assignedTo | attributes |
| linked device hostname/IP | notes | attributes |
| `in_service` | `active` | attributes |
| `maintenance` | `in_repair` | attributes |
| `retired` or delete in NETMON | `retired` | CI **kept** |
| `outage` | `active` + outage note | attributes |

Fingerprint `netmon:{tenantId}:{ciId}` makes create/update idempotent. The worker queue `netmon-cmdb-sync` retries three times. A failed push **does not** undo the NETMON save. The CMDB table shows **Synced** or **Sync error**.

Laptop NETMON can push to cloud NovaCRM if the machine has internet. NovaCRM cannot call `localhost`.

### Operator check

1. `/dashboard/cmdb` → Add CI → Save.
2. Refresh if the NovaCRM column is still empty (worker, a few seconds).
3. NovaCRM desk: switch to **Internal** (or the account UUID you set) → Assets and CMDB.

Edit in NETMON updates the same remote rows. Delete in NETMON **retires** the asset; the NovaCRM CI remains so tickets stay linked.

### Out of scope (v1)

NovaCRM → NETMON, CI relationship graph, IP segments, bulk CSV import into NovaCRM.

## Deploy note

NETMON needs Prisma migration `0012_cmdb_novacrm_sync` (`npx prisma migrate deploy` on **worker**, not `web`). NovaCRM needs the `cmdb` webhook in the running web image before sync will succeed.

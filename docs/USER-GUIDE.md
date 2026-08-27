# User guide

UI chrome is English. Dark mode is default; light mode is in the header.

**Putting devices under watch:** [MONITORING.md](MONITORING.md) (including CCTV/NVR up/down, not live video). In the app: **Help** (`/dashboard/help`) is searchable (probe, agent, token, down, cctv).

## NOC console (`/dashboard`)

Sign in as admin or operator.

### Monitor

| Page | Path | What to do |
| --- | --- | --- |
| Overview | `/dashboard` | KPI cards, Indonesia site map, live estate |
| Alerts | `/dashboard/alerts` | Firing / resolved. Open a ticket from a firing alert |
| Tickets | `/dashboard/tickets` | Inbox for local helpdesk and remote ITSM |
| Topology | `/dashboard/topology` | Live links; upload CSV / Excel / JSON. Download filled CSV, Excel, or PDF. |
| Map | `/dashboard/map` | Indonesia cities where devices are installed. Set City on Inventory. |
| SLA | `/dashboard/sla` | 30-day uptime |

### Assets

| Page | Path | What to do |
| --- | --- | --- |
| Inventory | `/dashboard/devices` | Hostname + IP (mono). Set **City** for the Indonesia map. Bulk mark / delete |
| CMDB | `/dashboard/cmdb` | Add / edit / delete CIs. Optional **Sync CMDB** to NovaCRM ([CMDB.md](CMDB.md)). Portal is read-only. |
| Import | `/dashboard/import` | CSV / Excel inventory |
| Agents | `/dashboard/agents` | Issue a token for an existing Inventory device, then install the host script. Up/down is mainly the 60s TCP poller; the agent is an optional push of CPU/RAM/disk. |

### Analyze

| Page | Path | What to do |
| --- | --- | --- |
| Insights | `/dashboard/ai` | Copilot over tenant data |
| Knowledge | `/dashboard/knowledge` | Runbooks; portal sees published only |
| Boards | `/dashboard/dashboards` | JSON widget layouts |
| Reports | `/dashboard/reports` | Period (24h / 7d / 30d / month / custom). Table preview. Download PDF or Excel. |

### Admin

| Page | Path | Who |
| --- | --- | --- |
| Users | `/dashboard/users` | admin+: add, edit name/email/role, reset password, delete (not self / last admin) |
| Settings | `/dashboard/settings` | Channels, Ticketing, AI |
| Security | `/dashboard/security` | TOTP 2FA, session idle timeout (per tenant), password rotation (30 days). Absolute session max is `SESSION_MAX_HOURS` (default 8h) — [SESSION.md](SESSION.md). |
| Account | `/dashboard/account` | Change own password (required when older than 30 days) |
| Platform | `/admin` | superadmin only |

Header: global search (`⌘K` / `Ctrl+K`), **EN | ID**, theme, **notification bell**, **Account** (change your own password), portal link, sign out.

Idle timeout is configured on **Security** (Never / 15 / 30 / 60 minutes). No keyboard, click, scroll, or pointer movement signs the session out after that window (with a 60s warning). See [SESSION.md](SESSION.md). Absolute lifetime still ends the JWT after `SESSION_MAX_HOURS` even if the console stays active.

Passwords expire every **30 days** by default (Never / 30 / 60 / 90 on Security). NETMON reminds you 7 days before, then blocks the rest of the app until you set a new password on **Account**.

A **running incident line** sticks to the **bottom** of the console when there is a mass outage, or when an operator writes a custom message (**Security** → Incident ticker). It links to Alerts. Portal viewers see the same line.

Change the seed password on first login (**Account**). Superadmin on production is `admin@netmon.click`.

### Tickets (reply)

1. Open `/dashboard/tickets` and a row with a remote id (`INC…`).
2. **Send response** posts the comment to NovaCRM (or the other ITSM).
3. **Respond and resolve** also closes the ticket.

Viewers on `/portal` can see tickets but cannot reply. Full connector notes: [TICKETING.md](TICKETING.md).

## Customer portal (`/portal`)

Login as `viewer`. Read-only: Overview, Assets, CMDB, Topology, Map, Tickets, Knowledge, AI. The same mass-incident ticker appears here. Password rotation still applies.

Public status (no login): `/status/{tenant-slug}`.

## Typical NOC flow

1. Device goes down → poller creates a **critical** `device_down` alert.
2. Enabled notify channels fire (email / Slack / …).
3. Enabled ticketing connectors with auto-open create a ticket (NETMON Helpdesk and/or NovaCRM).
4. Bell shows an in-app notification.
5. When the device answers TCP again, the alert resolves and remote tickets get a recover comment.

## Seed demo tenants

| Tenant | Slug | Plan |
| --- | --- | --- |
| PT Demo Nusantara | `demo` | cloud_pro |
| Acme Fiber | `acme` | cloud_basic |
| Jakarta Metro ISP | `jakarta` | cloud_enterprise |

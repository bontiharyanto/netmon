# User guide

UI chrome is English. Dark mode is default; light mode is in the header.

## NOC console (`/dashboard`)

Sign in as admin or operator.

### Monitor

| Page | Path | What to do |
| --- | --- | --- |
| Overview | `/dashboard` | KPI cards, live estate |
| Alerts | `/dashboard/alerts` | Firing / resolved. Open a ticket from a firing alert |
| Tickets | `/dashboard/tickets` | Inbox for local helpdesk and remote ITSM |
| Topology | `/dashboard/topology` | Live links; upload CSV / Excel / JSON |
| SLA | `/dashboard/sla` | 30-day uptime |

### Assets

| Page | Path | What to do |
| --- | --- | --- |
| Inventory | `/dashboard/devices` | Hostname + IP (mono). Bulk mark / delete |
| CMDB | `/dashboard/cmdb` | CI, asset tag, serial, owner |
| Import | `/dashboard/import` | CSV / Excel inventory |
| Agents | `/dashboard/agents` | Enroll token, heartbeat |

### Analyze

| Page | Path | What to do |
| --- | --- | --- |
| Insights | `/dashboard/ai` | Copilot over tenant data |
| Knowledge | `/dashboard/knowledge` | Runbooks; portal sees published only |
| Boards | `/dashboard/dashboards` | JSON widget layouts |
| Reports | `/dashboard/reports` | PDF export |

### Admin

| Page | Path | Who |
| --- | --- | --- |
| Users | `/dashboard/users` | admin+ |
| Settings | `/dashboard/settings` | Channels, Ticketing, AI |
| Security | `/dashboard/security` | TOTP 2FA, session idle timeout |
| Platform | `/admin` | superadmin only |

Header: global search (`⌘K` / `Ctrl+K`), **EN | ID**, theme, **notification bell**, portal link, sign out.

Idle timeout is configured on **Security** (Never / 15 / 30 / 60 minutes). No keyboard, click, or scroll signs the session out.

## Customer portal (`/portal`)

Login as `viewer`. Read-only: Overview, Assets, CMDB, Topology, Tickets, Knowledge, AI.

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

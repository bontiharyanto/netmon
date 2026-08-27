# Monitor devices with NETMON

This is the operator handbook: how a device gets into NETMON, what “up / down” means, and what you configure.

UI: English default. Paths below are for the NOC (`/dashboard`). Viewers use `/portal` (read-only).

Related: [User guide](USER-GUIDE.md) · [Agents](AGENT.md) · [Channels](CHANNELS.md) · [Ticketing](TICKETING.md) · [CMDB](CMDB.md) · [Architecture](ARCHITECTURE.md)

---

## 1. What “monitored” means

A device is monitored only after **both** of these are true:

1. It exists in **Inventory** (hostname + IP belong to your tenant).
2. At least one probe can update its status:
   - **Poller** (default) — NETMON reaches out to the device, or
   - **Agent** (optional) — the device reaches out to NETMON.

Until then, Overview / Alerts / SLA have nothing to watch.

```text
You  →  Inventory (hostname, IP, type, location)
     →  Poller every 60s  TCP :80  from the NETMON worker
     →  and/or Agent heartbeat  HTTPS POST  from the host
     →  status up|down  ·  alert  ·  SLA  ·  Overview
```

NETMON does **not** discover the network by itself. You register devices (form, CSV/Excel, or seed).

Default probe is configurable per device (**TCP ports**, optional **HTTP** synthetic, optional **ICMP**). See [CHECKS.md](CHECKS.md). Legacy default remains TCP **:80** when checks are unset.

---

## 2. Choose the probe that can actually reach the device

| Where NETMON runs | Device IP | What works |
| --- | --- | --- |
| Cloud SaaS `netmon.click` (VPS `103.190.214.224`) | Public IP, TCP **80** open from that VPS | **Poller** |
| Cloud SaaS | Private `10.x` / `172.16.x` / `192.168.x` | Poller stays **down**. Use an **agent** on the host (host must reach `https://….netmon.click`) |
| On-premise (worker on the customer LAN) | Private IP, TCP 80 reachable from the worker | **Poller** |
| Any | Host can run a script and HTTPS outbound | **Agent** (marks that device `up` on heartbeat) |

The demo estate uses RFC1918 addresses (`10.10.x.x`). From the public VPS those addresses are unreachable, so a mass “all devices down” ticker is expected until you either:

- put **public** IPs (or NAT) that answer TCP 80 from `103.190.214.224`, or
- install **agents** on hosts that can call NETMON, or
- run NETMON **on-prem** on the same LAN as the devices.

---

## 3. Sign in and land on the right console

| Role | URL after login | Can add devices / tokens |
| --- | --- | --- |
| superadmin / admin / operator | `/dashboard` | Yes |
| viewer | `/portal` | No (read-only) |

Cloud tenant URL: `https://{slug}.netmon.click` (example: [demo.netmon.click](https://demo.netmon.click)).

---

## 4. Register devices (required)

### 4.1 One device — Inventory

1. Open **Inventory** → `/dashboard/devices`.
2. **Add device**:
   - `hostname` — unique per tenant (example `edge-fw-01`)
   - `ip` — unique in the whole database (example `103.190.214.20`)
   - `type` — `switch` / `firewall` / `router` / `server` / `nvr` / `camera` / …
   - `location` — optional (`DC-A / Rack-01`)
3. Click **Add**.

Status starts as `unknown` until the first successful probe.

Tenant `device_limit` (plan) caps how many rows you can create. Superadmin sees limits on `/admin`.

### 4.2 Many devices — Import

1. Open **Import** → `/dashboard/import`.
2. Upload `.csv`, `.xlsx`, or `.xls`.
3. Header row **must** include:

```text
hostname,ip,type,location
core-sw-01,103.190.214.10,switch,DC-A
edge-fw-01,103.190.214.11,firewall,Edge
```

`hostname` and `ip` are required. `type` defaults to `unknown` if omitted.

### 4.3 Firewall on the device (for poller)

Allow **TCP port 80** from the NETMON worker:

- Cloud: source `103.190.214.224`
- On-prem: source = the NMS server IP

HTTP does not need a useful website. A SYN-ACK on `:80` is enough for “up”. If the box has no listener on 80, poller will report **down** even if the device is alive (ICMP-only gear, or HTTPS-only on 443).

### 4.4 CCTV / NVR / cameras

NETMON can watch cameras, NVRs, and DVRs as **inventory devices** (up/down, alert, SLA, map). It is **not** a VMS: no live view, no RTSP/ONVIF, no recording, no mosaic.

`vendor` is optional free text. Hikvision, Dahua, Axis, Uniview, Bosch, and generic IPC all use the same probe. There is no brand SDK.

1. Inventory: hostname (`nvr-bsd-01` / `cam-lobby-01`), IP, type `nvr` or `camera`, optional vendor and city.
2. Probe:
   - **Cloud** + public IP: open HTTP **TCP 80** from `103.190.214.224` (or NAT 80 → the NVR’s web port if the UI is on 8080).
   - **Cloud** + private `10.x` / `192.168.x`: poller cannot reach the LAN. Issue an **agent** on the NVR or a jump host that can HTTPS to `https://{tenant}.netmon.click`.
   - **On-prem** worker on the same LAN: TCP 80 on the LAN is enough.
3. Wait ~60s for Overview. Set **City** if the site should appear on the Indonesia map.

NETMON does **not** import camera lists from a VMS (HikCentral, Milestone, Dahua DSS, …). Register each NVR or camera IP in Inventory.

---

## 5. Poller configuration (default up/down)

Nothing to click per device. The **worker** process is the poller.

| Setting | Value today | Where |
| --- | --- | --- |
| Interval | 60 seconds | `worker/index.ts` (BullMQ repeat) |
| Probe | TCP connect | `lib/poller.ts` |
| Port | **80** (fixed) | not in the UI |
| Timeout | 2.5 seconds | not in the UI |
| Scope | every `device` row | all tenants |

On each tick the worker:

1. TCP to `device.ip:80`.
2. Sets `device.status` to `up` or `down`.
3. Writes a `metric` sample: **agent** if fresh, else **SNMP GET** if enabled, else **synthetic jitter** (not real host load). See [SNMP.md](SNMP.md).
4. Updates `sla.uptime_30d`.
5. Evaluates **alert rules** (default: `device_down` critical). Respects **maintenance windows** (suppress alert/notify/ticket).
6. If condition clears: resolve matching firing alerts, recover comment on tickets.

Configurable rules and maintenance: [P3.md](P3.md) · UI `/dashboard/alert-rules`, `/dashboard/maintenance`.

### Make sure the worker is running

**Cloud VPS** (`docker-compose.cloud.yml`): service `worker` must be `up`.

```bash
docker compose -f docker-compose.cloud.yml ps worker
docker compose -f docker-compose.cloud.yml logs -f worker
```

You should see `[NETMON poller] worker started` and `checked N devices`.

**Laptop:** Redis + Postgres up, then a second terminal:

```bash
npm run worker
```

If only `npm run dev` is running, Inventory exists but status will not move.

Also required: `REDIS_URL` (BullMQ) and `DATABASE_URL`.

---

## 6. Agent configuration (optional push)

Use this when the poller cannot open TCP to the device, but the device **can** call NETMON over HTTPS.

An agent is **not** a new device. There is no Add button. You issue a **token** for an Inventory row.

### 6.1 Issue a token

1. Device already in Inventory.
2. **Agents** → `/dashboard/agents`.
3. Pick the hostname → **Issue token**.
4. Status `pending` = token exists, no heartbeat yet.

Issuing again **rotates** the token. The old hex stops working.

### 6.2 Install on the host

On **that** machine (not a random jump host unless you intend to), use **Copy install command** from the card. It looks like:

```bash
curl -sS https://demo.netmon.click/agent.sh | bash -s -- --token=<48-char-hex> --url=https://demo.netmon.click
```

- `--token=` must be the hex from the card. **Never** `TOKEN_DARI_KARTU` or `AGENT_TOKEN` — that returns `Unknown agent`.
- `--url=` must be the same origin you opened in the browser (`https://demo.netmon.click` or `https://netmon.click` or your on-prem URL).

Laptop / on-prem file copy:

```bash
NETMON_URL=http://localhost:3000 sh public/agent.sh --token=<hex> --url=http://localhost:3000
```

A single run only proves the path (`{"ok":true}` and agent becomes `online`). To stay online, cron every minute:

```bash
* * * * * curl -sS https://demo.netmon.click/agent.sh | bash -s -- --token=<hex> --url=https://demo.netmon.click >/dev/null 2>&1
```

### 6.3 What the heartbeat does

`POST {url}/api/agent/heartbeat` (no login cookie; the token is the secret):

```json
{
  "token": "<hex>",
  "cpu_percent": 12.5,
  "ram_percent": 41,
  "disk_percent": 58,
  "version": "1.0.0"
}
```

NETMON then: agent `online`, device `up`, one metric row. Host CPU is sampled by `agent.sh`; RAM/disk in the stock script are placeholders until you replace them with real collectors.

The host needs **outbound HTTPS** to your NETMON URL (firewall / proxy). NETMON never SSH into the device.

Full notes: [AGENT.md](AGENT.md).

---

## 7. Topology (optional map, not the probe)

Topology does not poll. It only draws links between Inventory hostnames/IPs.

1. `/dashboard/topology`
2. Upload CSV / Excel / JSON with columns `from`, `to`, `status` (`up` / `down` / `degraded`).
3. Endpoints must already exist in Inventory.
4. **Download CSV / Excel / PDF** exports the **current** link table (Excel also has a `devices` sheet). PDF is print-only.

---

## 8. Alerts, notifications, tickets

When the poller sees a device go down:

| Step | What happens | You configure |
| --- | --- | --- |
| Alert | From enabled **alert rules** (default `device_down` critical). Optional `message` + `rule_id`. | automatic |
| Maintenance | Active windows can suppress alert create, notify, and/or auto-ticket; device status is not faked | `/dashboard/maintenance` |
| Bell | In-app notification | automatic |
| Channels | Email, Slack, Teams, Telegram, WhatsApp, Discord, SMS, PagerDuty, webhook, SNMP trap | **Settings → Channels** — enable + severity |
| Tickets | NETMON Helpdesk and/or NovaCRM / Jira | **Settings → Ticketing** — enable + auto-open |

Channel secrets use `ENCRYPT_KEY` in `.env`. Test each channel with **Test**.

Inbound email replies: see [CHANNELS.md](CHANNELS.md). NovaCRM connector: [TICKETING.md](TICKETING.md).

Acknowledge / resolve from **Alerts** (`/dashboard/alerts`). Viewers cannot write.

---

## 9. What you watch after devices are in

| Page | Path | Use |
| --- | --- | --- |
| Overview | `/dashboard` | KPI: up / down / firing / SLA |
| Alerts | `/dashboard/alerts` | Firing incidents |
| Alert rules | `/dashboard/alert-rules` | Threshold / status rules |
| Maintenance | `/dashboard/maintenance` | Suppress windows |
| SLA | `/dashboard/sla` | 30-day uptime (from poller ticks) |
| CMDB | `/dashboard/cmdb` | Asset tag, serial, owner. Optional NovaCRM sync: [CMDB.md](CMDB.md) |
| Public status | `/status/{slug}` | No login |
| Incident ticker | bottom sticky | Auto on mass down, or custom text on **Security** |

Mass ticker: several devices down (or many firing alerts), or an operator-written line. [User guide](USER-GUIDE.md).

---

## 10. Platform configuration checklist

### `.env` (never commit)

| Variable | Why it matters for monitoring |
| --- | --- |
| `DATABASE_URL` | Inventory, alerts, metrics |
| `REDIS_URL` | Poller queue (BullMQ) |
| `NEXTAUTH_URL` / `APP_URL` | Login cookies; agent URL; inbound webhooks |
| `IS_SAAS` | `true` cloud multi-tenant; `false` on-prem |
| `ENCRYPT_KEY` | Channel / ticket secrets |
| `SERVER_IP` | Documented public probe source (`103.190.214.224` on cloud) |
| `AI_API_KEY` | Optional copilot; not required to poll |

Cloud production: `NEXTAUTH_URL=https://netmon.click`, `APP_URL=https://netmon.click`.

On-prem: `NEXTAUTH_URL` / `APP_URL` = the customer URL (or `http://IP:3000`). Worker must run **on the LAN** that can TCP to device IPs.

### Processes

| Process | Role |
| --- | --- |
| `web` | UI + APIs + `/api/agent/heartbeat` |
| `worker` | TCP poller every 60s |
| `postgres` | Source of truth |
| `redis` | Poll jobs |

### Security (operators)

- `/dashboard/security` — session idle, absolute max (`SESSION_MAX_HOURS`), password rotation (default 30 days), 2FA — [SESSION.md](SESSION.md)
- `/dashboard/account` — own password

---

## 11. Recommended setups

**A. Customer LAN, NETMON on-prem**  
Inventory → worker on the same network → poller TCP 80 → channels. Agent only for hosts that do not listen on 80.

**B. Cloud SaaS, public CPE / servers**  
Inventory with **public** IPs → open TCP 80 from `103.190.214.224` → poller. Optional agent for CPU samples.

**C. Cloud SaaS, private-only devices**  
Inventory still required (hostname + a unique IP field) → **agent** on each host with outbound HTTPS to `{slug}.netmon.click`. Poller will keep showing down for those IPs; trust agent `online` + last seen, or run an on-prem collector later.

---

## 12. Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Status stuck `unknown` | Worker not running | Start `worker`; check Redis |
| All devices `down` on cloud | Private IPs or port 80 closed | Public IP + TCP 80, or install agents |
| Agent `pending` | No successful heartbeat | Run **Copy install command** on the **device** |
| `{"error":"Unknown agent"}` | Placeholder or rotated token | Copy hex from the Agents card, not `TOKEN_DARI_KARTU` |
| Heartbeat OK but Overview still down | Poller overwrites status 60s later if TCP 80 fails | Open port 80 or accept poller vs agent conflict on cloud+private IP |
| Import skips rows | Missing `hostname` or `ip` | Fix spreadsheet headers |
| `Device limit tercapai` | Plan cap | Superadmin `/admin` or raise `device_limit` |
| No email/Slack on down | Channel disabled or severity mismatch | Settings → Channels → enable `critical` |
| No ticket | Connector off or auto-open off | Settings → Ticketing |

---

## 13. End-to-end lab (public IP)

1. Inventory: hostname `lab-fw-01`, IP = a host that answers TCP 80 from the internet (or from the on-prem worker).
2. Confirm `worker` logs a check.
3. Within ~60s, Overview shows **up**.
4. Block port 80 (or shut the host) → **down** + firing alert.
5. Optional: issue agent token, run install command, see Agents **online**.

---

## 14. What this version does not do yet

- ICMP ping / SNMP GET / TCP port other than 80 (poller port is fixed at 80)
- Auto-discovery / CDP / LLDP ingest (topology is a file you upload)
- NETMON pulling via SSH into the device
- CCTV live view, RTSP/ONVIF, recording, or sync from a VMS

Those would be new product work. Today you **register**, then **poll TCP 80** and/or **push a heartbeat**.

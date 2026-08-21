# Agents

NOC: `/dashboard/agents` (permission `agent.enroll`).

How devices get monitored overall (poller **and** agent): [MONITORING.md](MONITORING.md).

An agent is **not a new device**. The device must already exist in Inventory. This page only issues a token and shows the install command. There is no Add button.

## What marks a device up or down

Two independent paths:

1. **Poller (default, all devices)** — the NETMON worker, every 60 seconds, opens a TCP connection to the device IP (port 80). Reachable → `up`. Unreachable → `down` + `device_down` alert. If the VPS cannot route to a private IP (`10.x`, `172.16.x`), the poller will keep that device **down**. That is expected.
2. **Agent (optional, per host)** — a script on the host **pushes** a heartbeat to NETMON. NETMON never SSHs in. First successful POST → agent `pending` becomes `online`, and that device is set `up`. Heartbeats also store CPU / RAM / disk samples.

Use an agent when the poller cannot reach the host, but the host can reach `https://netmon.click` (or your tenant URL).

## Enroll

1. Create the device in **Inventory** (hostname + IP).
2. **Agents** → pick that device → **Issue token**.
3. On **that host**, click **Copy install command** on the card and paste it. The command already contains the real hex token.

Example shape (the token is ~48 hex characters, not a word):

```bash
curl -sS https://demo.netmon.click/agent.sh | bash -s -- --token=a1b2c3d4… --url=https://demo.netmon.click
```

Laptop / on-prem:

```bash
NETMON_URL=http://localhost:3000 sh public/agent.sh --token=<hex> --url=http://localhost:3000
```

`pending` = token exists, no heartbeat yet. `online` = host has pushed at least one beat.

To keep the agent online, run the same command from cron (for example every minute). A one-shot curl only proves the path.

### `{"error":"Unknown agent"}`

The token NETMON received is not in the database. Usual cause: the example word `TOKEN_DARI_KARTU` / `AGENT_TOKEN` was pasted instead of **Copy install command**.

Fix:

1. Open `https://demo.netmon.click/dashboard/agents`
2. On the device card, **Copy install command**
3. Paste that full line on the host (hex token + `--url=…`)

Do not invent a token. Issuing a new token on the same device **replaces** the old one; the previous hex stops working.

## API

`POST /api/agent/heartbeat` — no login cookie. The token is the credential.

```json
{
  "token": "…",
  "cpu_percent": 12.5,
  "ram_percent": 41,
  "disk_percent": 58,
  "version": "1.0.0"
}
```

Manage tokens: `GET/POST /api/agents` (session + enroll permission).

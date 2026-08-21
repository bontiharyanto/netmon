# Agents

NOC: `/dashboard/agents` (permission `agent.enroll`).

Each agent is bound to a device and a token. The host sends periodic heartbeats; NETMON updates last seen and metric samples.

## Enroll

1. Create or pick a device in Inventory.
2. Open Agents → issue a token.
3. On the host:

```bash
curl -s https://netmon.click/agent.sh | bash -s -- --token=AGENT_TOKEN
```

Laptop / on-prem: set the origin.

```bash
NETMON_URL=http://localhost:3000 sh public/agent.sh --token=AGENT_TOKEN
```

The script POSTs `cpu_percent`, `ram_percent`, `disk_percent`, `version` to `/api/agent/heartbeat`.

## API

`POST /api/agent/heartbeat`

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

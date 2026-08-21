# Ticketing

NETMON can keep tickets locally and/or open them in an external ITSM. Bidirectional sync uses outbound HTTP plus an inbound webhook per connector.

Settings: **Admin → Settings → Ticketing** (`/dashboard/settings/tickets`).

Inbox: `/dashboard/tickets` (NOC) and `/portal/tickets` (viewer, read-only).

## Connectors

| Provider | Role |
| --- | --- |
| **NETMON Helpdesk** | Local tickets. Created automatically for the tenant. No Base URL. |
| **NovaCRM** | `novacrm.click` operations desk (first-party). Alert webhook. |
| Jira | Cloud / Data Center issues |
| ServiceNow | Table API (default `incident`) |
| Zendesk | Tickets + comments |
| Freshdesk | Tickets + notes |
| GLPI | REST session + Ticket |
| osTicket | HTTP API |
| Custom webhook | POST JSON to any URL |

One saved connector per integration. Enable only after **Test connection** succeeds.

## Auto-ticket rules

On each connector:

- Direction: receive and respond / receive only / open only
- Severities: `critical`, `warning`
- Events: all firing events, or `device_down`, `high_latency`, `packet_loss`, `disk_almost_full`, `interface_flapping`
- **Auto-open a ticket when a matching alert fires**

Duplicates: one ticket per alert × connector. Recovered alerts add an outbound comment and can close the ticket.

## NovaCRM (`novacrm.click`)

NETMON **pushes** incidents into NovaCRM. It does not need a new NovaCRM plugin named “NETMON” or “REST API”.

### In NovaCRM

1. Open **Configuration → Integrations**.
2. Click the existing card **Other** (hint: *Alert / email / generic inbound*).
3. Do **not** use **Add plugin**.
4. Create an **Alert secret** yourself (random, **≥ 16 characters**). Example: `openssl rand -hex 16`.
5. **Save**. Weak values (`change-me`, `local-alert-secret`, shorter than 16) are rejected.

### In NETMON

| Field | Value |
| --- | --- |
| Base URL | `https://novacrm.click` |
| Tenant slug | NovaCRM tenant, lab is `novacrm-demo` |
| Alert webhook secret | **The same** Alert secret |

Save → Test connection → Enable. Optional: auto-open on firing alerts.

NETMON calls:

`POST https://novacrm.click/api/v1/t/{slug}/webhooks/alerts`

Headers: `x-webhook-secret`, `X-Tenant-Id: {slug}`.

Repeat alerts within 24 hours update the **same** NovaCRM ticket (fingerprint `netmon:{ticketId}`).

### Laptop vs cloud

| From | To | Result |
| --- | --- | --- |
| NETMON on `localhost:3000` | NovaCRM cloud | Ticket create **works** |
| NovaCRM cloud | NETMON `localhost` inbound URL | **Does not work** |

Smoke test (after secret is saved): Test connection, then open a ticket from a firing alert. A NovaCRM incident number (`INC…`) and URL appear on the NETMON ticket.

Inbound webhook on the NETMON connector is for NovaCRM (or a workflow) to POST updates **back**. That URL must be a public `APP_URL`, not localhost.

## Other ITSMs

Fill Base URL + credentials, save, test. Point the vendor webhook at:

`{APP_URL}/api/tickets/inbound/{token}`

Payloads accepted: Jira issue, Zendesk ticket, ServiceNow incident, generic `{ title, body, external_id, status, comment }`.

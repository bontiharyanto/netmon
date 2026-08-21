# Ticketing

NETMON can keep tickets locally and/or open them in an external ITSM. Bidirectional sync uses outbound HTTP plus an inbound webhook per connector.

Settings: **Settings → Ticketing** (`/dashboard/settings/tickets`).

Inbox: `/dashboard/tickets` (NOC) and `/portal/tickets` (viewer, read-only).

## Helpdesk vs NovaCRM

These are **two different connectors**. Renaming Helpdesk to “NovaCRM” does not send tickets to `novacrm.click`.

| Row in Settings | Provider label | What it does |
| --- | --- | --- |
| NETMON Helpdesk | **NETMON Helpdesk** | Tickets **inside** NETMON only. No Base URL, no slug, no alert secret. |
| NovaCRM | **NovaCRM** | Opens incidents on **novacrm.click**. Needs Base URL, tenant slug, and Alert webhook secret. |

Add NovaCRM with the button **Add NovaCRM**. Do not edit the Helpdesk form and paste a NovaCRM secret there.

To stop local auto-tickets: open the **NETMON Helpdesk** row, uncheck **Enable connector** and **Auto-open**, then **Save**. Leave the NovaCRM row enabled.

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

One saved connector per integration. **Save** before **Test connection**. Enable only after the test succeeds.

**Test connection** for NovaCRM only proves the tenant slug is reachable. It does **not** prove the Alert secret. A wrong secret still shows “reachable”, then ticket create fails with `Unauthorized webhook`.

## Auto-ticket rules

On each connector:

- Direction: receive and respond / receive only / open only
- Severities: `critical`, `warning`
- Events: all firing events, or `device_down`, `high_latency`, `packet_loss`, `disk_almost_full`, `interface_flapping`
- **Auto-open a ticket when a matching alert fires**

Duplicates: one ticket per alert × connector. Recovered alerts add an outbound comment and can close the ticket.

## Reply from NETMON (NOC)

Admin or operator only. Viewers cannot reply.

1. Open **Tickets** (`/dashboard/tickets`).
2. Open a ticket that has a remote id (`INC…` for NovaCRM).
3. In **Thread**, type the reply.
4. **Send response** — comment is pushed to NovaCRM; ticket stays open.
5. **Respond and resolve** — comment plus close on both sides.

If `last_error` is set on the ticket, outbound sync failed (wrong secret, remote down). Fix the connector, then reply again.

NovaCRM → NETMON comments only arrive if the connector **Inbound webhook** URL is pasted into a NovaCRM workflow. Laptop `localhost` inbound URLs are not reachable from NovaCRM cloud.

## NovaCRM (`novacrm.click`)

NETMON **pushes** incidents into NovaCRM. It does not need a new NovaCRM plugin named “NETMON” or “REST API”.

### In NovaCRM

1. Open **Configuration → Integrations**.
2. Click the existing card **Other** (hint: *Alert / email / generic inbound*).
3. Do **not** use **Add plugin**.
4. Create an **Alert secret** yourself (random, **≥ 16 characters**). Example: `openssl rand -hex 16`.
5. **Save**. Weak values (`change-me`, `local-alert-secret`, shorter than 16) are rejected.

### In NETMON

Click **Add NovaCRM** (new row). Do not reuse Helpdesk.

| Field | Value |
| --- | --- |
| Base URL | `https://novacrm.click` |
| Tenant slug | NovaCRM tenant, lab is `novacrm-demo` |
| Alert webhook secret | **The same** Alert secret |

Check **Enable connector**. **Save**, then **Test connection**. Optional: auto-open on firing alerts.

`ENCRYPT_KEY` differs per environment. An encrypted secret copied from laptop Postgres **will not** decrypt on the VPS. Paste the plaintext secret again in production, then Save.

NETMON calls:

`POST https://novacrm.click/api/v1/t/{slug}/webhooks/alerts`

Headers: `x-webhook-secret`, `X-Tenant-Id: {slug}`.

Repeat alerts within 24 hours update the **same** NovaCRM ticket (fingerprint `netmon:{ticketId}`).

### Laptop vs cloud

| From | To | Result |
| --- | --- | --- |
| NETMON on `localhost:3000` | NovaCRM cloud | Ticket create **works** |
| NETMON on `https://demo.netmon.click` | NovaCRM cloud | Ticket create **works** (after secret is saved on the VPS) |
| NovaCRM cloud | NETMON `localhost` inbound URL | **Does not work** |
| NovaCRM cloud | `https://netmon.click/api/tickets/inbound/…` | Works if that URL is in a NovaCRM workflow |

Smoke test: Test connection, then from a **firing** alert (or Tickets) open a ticket on the NovaCRM connector. The NETMON ticket must show `INC…` and **Open in ticketing system**. Empty `external_id` plus `Unauthorized webhook` means the secret on NETMON does not match NovaCRM.

## Other ITSMs

Fill Base URL + credentials, save, test. Point the vendor webhook at:

`{APP_URL}/api/tickets/inbound/{token}`

Payloads accepted: Jira issue, Zendesk ticket, ServiceNow incident, generic `{ title, body, external_id, status, comment }`.

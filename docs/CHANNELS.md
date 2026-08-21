# Notification channels

Settings: **Admin → Settings → Channels** (`/dashboard/settings`).

When an alert fires, NETMON notifies every **enabled** channel whose severity list includes the alert severity. Secrets are encrypted at rest and masked in the UI.

## Catalog

| Group | Types |
| --- | --- |
| Email | SMTP (`email`) |
| Messaging | Slack, Microsoft Teams, Telegram, WhatsApp, Discord |
| On-call | SMS (Twilio-compatible), PagerDuty |
| Infrastructure | Generic webhook, SNMP trap |

Every channel has **Reply-To**. Operators can reply by email; inbound mail is correlated with `[NETMON tkt_{id}]` or `[NETMON {token}]` in the subject.

## Inbound email replies

`POST /api/notify/inbound`

Body: `{ from, subject, text }` (Mailgun / similar shapes also parse). A matching ticket gets an inbound comment; the bell notifies the tenant.

## In-app bell

Header bell polls `GET /api/notifications` about every 20 seconds. Failed fetches never crash the shell. Mark-all-read: `PATCH /api/notifications`.

## Test

Open the channel → **Test**. SMTP needs a reachable host. Webhook tests POST a sample payload.

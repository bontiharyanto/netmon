# Session security

NETMON enforces two layers so unattended consoles do not stay open.

| Control | Scope | Default |
| --- | --- | --- |
| **Inactivity auto-logout** | Per tenant (`Security` → Session timeout) | 30 minutes |
| **Absolute session max** | Platform (`SESSION_MAX_HOURS`) | 8 hours |

Related: [User guide](USER-GUIDE.md) · [RBAC](RBAC.md) · [Operations](OPERATIONS.md)

## Inactivity (idle)

Admin sets **Never / 15 / 30 / 60** minutes on `/dashboard/security` (`security.manage`). Value is stored on `tenant.idle_minutes` and audited.

While a user is signed in:

1. Pointer, keyboard, scroll, and mouse activity refresh a **signed HttpOnly** cookie (`netmon_idle`) via `POST /api/security/activity` (throttled).
2. The client shows a countdown warning in the last **60 seconds**, then calls NextAuth `signOut` (`/login?idle=1`).
3. Other open tabs receive a `BroadcastChannel` logout message.
4. Middleware verifies the cookie signature and age on every `/dashboard`, `/portal`, and `/admin` navigation. An expired cookie clears the session cookies and redirects to login.

`Never` disables only the idle timer. Absolute max still applies.

Compliance note: prefer **15 or 30 minutes** for shared NOC workstations. `Never` is for controlled on-prem labs.

## Absolute session lifetime

Even with continuous activity, the JWT cannot live longer than `SESSION_MAX_HOURS` (1–24, default **8**). Set in `.env`:

```bash
SESSION_MAX_HOURS=8
```

After that window the user must sign in again (password + 2FA if enabled).

## Login message

`/login?idle=1` shows the inactivity message (EN/ID). Absolute expiry uses the normal NextAuth sign-in flow without that query.

## What this is not

- Not a replace for 2FA or password rotation ([Security](/dashboard/security)).
- Idle is not enforced on public `/status` or agent heartbeat APIs.
- Deleting the idle cookie in the browser weakens idle enforcement until the next activity ping; absolute JWT max still caps the session.

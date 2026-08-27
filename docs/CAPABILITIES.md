# Capability Matrix

Platform-wide role → permission grants. Superadmins edit the live matrix at `/dashboard/admin/permissions`.

## Behaviour

- Stored in `role_capability` (one row per role × permission).
- First load seeds product defaults from `DEFAULT_MATRIX` in `lib/roles.ts`.
- `requirePermission` and related API gates read the DB-backed matrix (short in-memory cache).
- Session JWT carries `permissions[]` for navigation; refreshes about every 5 minutes (`updateAge`) or on re-login.
- Saves and resets are audited: `capabilities.update` / `capabilities.reset`.

## Locked cells (cannot toggle)

| Rule | Effect |
| --- | --- |
| `platform.admin` | Always on for `superadmin`, always off for other roles |
| Viewer write/manage | Portal stays read-only — write, manage, export, enroll, builder, NOC console stay off |

## API

```http
GET  /api/admin/capabilities          # platform.admin
PUT  /api/admin/capabilities          # body { matrix: { superadmin: [...], admin: [...], ... } }
POST /api/admin/capabilities          # body { action: "reset" }
```

## Related

- Roles helpers: `lib/roles.ts`
- Persistence: `lib/capabilities.ts`
- Classic overview: [RBAC.md](RBAC.md)

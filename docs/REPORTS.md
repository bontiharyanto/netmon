# Reporting Center

Tenant-scoped analytics and export for NOC operators (`reports.export`).

## UI

`/dashboard/reports`

- **Templates:** Operations · Inventory · Alerts · Tickets · SLA
- **Period:** 24h / 7d / 30d / this month / custom (UTC)
- **Filters:** city, device type, status, alert severity
- **Preview:** KPI cards + tables for the active template
- **Export:** PDF, Excel (`.xlsx`), CSV — each file download writes `report.export:{template}:{format}` to the audit log

## Semantics

| Field | Meaning |
| --- | --- |
| Device status | Current inventory state (not historical) |
| Alerts / tickets | Created within `from`–`to` |
| SLA | Rolling 30-day uptime on each device (not recomputed for the range) |
| CPU / RAM / disk | Average of metrics samples in the selected period |
| Row cap | 2 000 rows per section (`REPORT_ROW_CAP`); `truncated.*` flags when capped |

## API

```http
GET /api/reports/meta
GET /api/reports?from=&to=&template=operations&city=&type=&status=&severity=&format=json|pdf|xlsx|csv
```

Requires `reports.export` (admin, operator, superadmin). Viewers do not get this module.

## Out of scope (v1)

Scheduled email delivery, portal reports, async generation jobs, and interactive charts.

# Facility sensors & floor heat (P3c)

## Sensors

Inventory type **`sensor`** with:

| Field | Meaning |
| --- | --- |
| `sensor_kind` | `temperature` · `humidity` · `power` · `other` |
| `sensor_json_path` | Dot path into HTTP JSON (default `temp_c`) |
| `last_sensor_value` / `last_sensor_unit` | Last successful reading |

Probe: HTTP GET of the URL in `checks.http[0]`, parse JSON, read path. Success → `up` + store value. Failure → `down`. TCP fallback is not used when only HTTP is configured.

Alert event **`sensor_threshold`**: `{ "op": ">", "value": 28 }`.

## Floor heat map

Toggle **Heat map** on `/dashboard/floors` and `/portal/floors` (read-only).

Overlay uses IDW interpolation from temperature sensor pins (`type=sensor` + `sensor_kind=temperature` + `last_sensor_value`). Legend shows range. Empty state if no readings on the floor.

Not a DCIM / CFD product.

## Migration

`0019_p3c_sensors_heatmap` — rebuild web + worker, then `prisma migrate deploy`.

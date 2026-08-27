# Floor plans

Building / office floor plans with device pins (Plan A). Heat maps are out of scope for this version.

## Concepts

| Entity | Meaning |
| --- | --- |
| Building | Site or campus building |
| Floor | One level with an optional plan image (JPG / PNG / WebP, max 8 MB) |
| Placement | Device pin at **x% / y%** on that image |

Coordinates are percentages of the image box so pins stay aligned when the UI scales.

## Access

| Surface | Path | Permission |
| --- | --- | --- |
| NOC | `/dashboard/floors` | `assets.read` view · `assets.write` edit |
| Portal | `/portal/floors` | read-only |

Writes are audited (`building.*`, `floor.*`, `floor.place`, …).

## API

```http
GET/POST   /api/floors/buildings
PATCH/DELETE /api/floors/buildings/{id}
POST       /api/floors
GET/PATCH/DELETE /api/floors/{id}
GET/POST/DELETE /api/floors/{id}/image
POST       /api/floors/{id}/placements
PATCH/DELETE /api/floors/placements/{id}
```

Images are stored in Postgres (`floor.image_data`) and served only to authenticated tenant sessions.

## Migration

```bash
docker compose -f docker-compose.cloud.yml exec worker npx prisma migrate deploy
```

Requires migration `0014_floor_plans`.

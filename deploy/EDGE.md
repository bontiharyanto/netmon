# Shared VPS edge

Production `netmon.click` shares a VPS with WorkPulse and ControlDesk. **WorkPulse Caddy** already binds **80/443**. NETMON must not start its own Traefik.

| Item | Value |
| --- | --- |
| App | https://netmon.click |
| Tenants | `demo`, `acme`, `jakarta` (add hosts in Caddy when onboarding) |
| Host | `103.190.214.224` |
| Compose | `docker-compose.cloud.yml` + `deploy/docker-compose.caddy.yml` |
| Publish | host **3008** → container 3000 |
| Caddyfile on disk | `/root/workpulse/docker/caddy/Caddyfile.ip` |
| Caddy network | `workpulse-prod_edge` (alias `netmon-web`) |
| Site snippet | `deploy/Caddyfile.netmon` |

## DNS (Hostinger)

```
A      @      103.190.214.224
A      *      103.190.214.224
```

`www` as **A** to the same IP, or **CNAME** `www` → `netmon.click` if Hostinger allows it. Wildcard `*` does not replace `@`. Leave Hostinger MX/DKIM records in place.

## Bring the stack up

Do **not** use `up -d --build` on this host (parallel web+worker builds run out of RAM).

```bash
cd ~/netmon/netmon
git pull origin main

export COMPOSE_BAKE=false
export COMPOSE_PARALLEL_LIMIT=1

docker compose -f docker-compose.cloud.yml stop traefik
docker compose -f docker-compose.cloud.yml rm -f traefik

docker compose -f docker-compose.cloud.yml build --progress=plain worker
docker compose -f docker-compose.cloud.yml build --progress=plain web
docker compose -f docker-compose.cloud.yml -f deploy/docker-compose.caddy.yml up -d postgres redis web worker

docker compose -f docker-compose.cloud.yml exec worker npx prisma migrate deploy
```

Run `npm run db:seed` **once** on an empty volume only (`exec worker`). Never seed a database that already has tenants.

Web must set `HOSTNAME=0.0.0.0` (already in compose). Otherwise Caddy gets **502** (`Connection refused` on the edge IP) while `http://127.0.0.1:3008` still works.

## Caddy

```bash
# confirm web is on the edge network
docker inspect netmon-web-1 --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'

cat deploy/Caddyfile.netmon >> /root/workpulse/docker/caddy/Caddyfile.ip
docker exec workpulse-prod-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

Do not wipe existing WorkPulse site blocks. Extra tenant hostnames must be added to the `netmon.click, …` site list, then reload.

TLS handshake `internal error` before the site exists is expected. After reload, `wget` from Caddy to `http://netmon-web:3000` must return 200.

## Account

After seed, change the superadmin password: header **Account** (`/dashboard/account`). Seed logins: [LOCAL.md](../docs/LOCAL.md).

Ticketing (NovaCRM vs Helpdesk, replies): [TICKETING.md](../docs/TICKETING.md).

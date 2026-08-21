# Shared VPS edge

This host (`node-patrick01`) already publishes **80/443** via **WorkPulse Caddy** (`workpulse-prod-caddy-1`, network `workpulse-prod_edge`). NETMON stays on **3008**. Do not start NETMON Traefik.

```bash
cd ~/netmon/netmon
git pull origin main

docker compose -f docker-compose.cloud.yml stop traefik
docker compose -f docker-compose.cloud.yml rm -f traefik

docker compose -f docker-compose.cloud.yml -f deploy/docker-compose.caddy.yml up -d
```

Find the Caddyfile:

```bash
docker inspect workpulse-prod-caddy-1 --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

Append `deploy/Caddyfile.netmon` to that file (usually a `Caddyfile` on disk), then:

```bash
docker exec workpulse-prod-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

If reload says the config path differs, use the `Destination` from inspect.

Caddy will request Let's Encrypt for `netmon.click`, `www`, `demo`, `acme`, and `jakarta`. Extra tenant hosts must be added to the site list.

# Shared VPS edge (port 80 already taken)

NETMON listens on **3008**. Do not start NETMON Traefik on this host.

## 1. See what owns 80/443

```bash
ss -tlnp | grep -E ':80 |:443 '
docker ps --format 'table {{.Names}}\t{{.Ports}}'
docker network ls
```

## 2A. Host Nginx

```bash
sudo cp deploy/nginx-netmon.click.conf /etc/nginx/sites-available/netmon.click
sudo ln -sf /etc/nginx/sites-available/netmon.click /etc/nginx/sites-enabled/netmon.click
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d netmon.click -d www.netmon.click -d demo.netmon.click
```

HTTP challenge cannot issue `*.netmon.click`. Add each tenant host to certbot, or use DNS-01 for a wildcard.

## 2B. Existing Docker Traefik (typical if NovaCRM is on this box)

```bash
# example network name — use the one from `docker network ls`
echo 'TRAEFIK_NETWORK=novacrm_default' >> .env
echo 'TRAEFIK_CERTRESOLVER=le' >> .env

docker compose -f docker-compose.cloud.yml stop traefik
docker compose -f docker-compose.cloud.yml rm -f traefik

docker compose -f docker-compose.cloud.yml -f deploy/docker-compose.proxy.yml up -d
```

Let's Encrypt resolver name must match the running Traefik (`le` on NovaCRM, not `letsencrypt`).

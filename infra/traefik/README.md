# Traefik infrastructure

This directory captures the exact shared Traefik layer currently running on the Hostinger VPS.

What is version controlled here:

- `docker-compose.yml`
- the intended ACME preference: `ISRG Root X1`
- the Docker 29 compatibility workaround: `DOCKER_API_VERSION=1.46`

What must stay only on the VPS:

- `.env`
- `letsencrypt/acme.json`
- any generated backups under `letsencrypt/backups/`

## Deploy on the VPS

```bash
cd ~/traefik
cp docker-compose.yml docker-compose.yml.bak
cp .env .env.bak
docker compose pull
docker compose up -d
```

## Required runtime files

Create a VPS-only `.env` file next to `docker-compose.yml`:

```bash
ACME_EMAIL=admin@gymholic.ae
```

## Notes

- This is the shared reverse proxy for all public HTTP/HTTPS traffic.
- Gymholic itself is still deployed from `docker-compose.prod.yml` plus `docker-compose.prod.hostinger.yml`.
- `acme.json` is generated state and must never be committed.

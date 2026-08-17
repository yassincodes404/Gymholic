# 💪 Gymholic

A fitness consultation booking platform — book sessions with trainers, manage availability, handle payments, and get calendar integrations with Google Meet.

## Architecture

```
                Internet
                   │
                   ▼
             Hostinger Traefik
               :80 / :443
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
  React Frontend       Spring Boot API
         :3000                │:8080
                     ┌───────┴────────┐
                     │                │
                     ▼                ▼
                PostgreSQL          Redis
```

**Backend**: Spring Boot 3.3 · Java 21 · Modular monolith  
**Frontend**: React · TypeScript · Next.js  
**Database**: PostgreSQL 16 · Flyway migrations  
**Cache**: Redis 7  
**Proxy**: Hostinger Traefik (edge TLS + routing)  
**CI/CD**: GitHub Actions → GHCR → Hostinger VPS

## Prerequisites

| Tool   | Version |
|--------|---------|
| Java   | 21+     |
| Maven  | 3.9+    |
| Node   | 20+     |
| Docker | 24+     |

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/yassincodes404/Gymholic.git
cd Gymholic

# 2. Create your environment file
cp .env.example .env
# Edit .env with your local values

# 3. Start all services
docker compose up

# 4. Access the application
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8080
# Swagger:   http://localhost:8080/swagger-ui.html
# Postgres:  localhost:5433
# Redis:     localhost:6380
```

## Development Without Docker

```bash
# Backend
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Frontend
cd frontend
npm install
npm run dev
```

## Production Deployment

Production uses Docker images from GHCR, deployed to Hostinger VPS via GitHub Actions.
Hostinger Traefik terminates public TLS and routes directly to the frontend and backend containers.

```bash
# On the VPS
docker compose -f docker-compose.prod.yml up -d
```

For Hostinger Traefik deployments, use the additional override described in [HOSTINGER_TRAEFIK_SETUP.md](HOSTINGER_TRAEFIK_SETUP.md).
The shared Traefik reverse-proxy layer is version controlled in `infra/traefik`.

## Project Structure

```
Gymholic/
├── backend/         # Spring Boot API
├── frontend/        # React + Next.js
├── infra/traefik/   # Edge reverse proxy (VPS)
├── .github/         # CI/CD workflows
├── docker-compose.yml        # Local dev
└── docker-compose.prod.yml   # Production
```

## License

MIT License — see [LICENSE](LICENSE).

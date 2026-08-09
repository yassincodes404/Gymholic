# 💪 Gymholic

A fitness consultation booking platform — book sessions with trainers, manage availability, handle payments, and get calendar integrations with Google Meet.

## Architecture

```
                    Internet
                       │
                       ▼
                    Nginx :80/:443
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
      React Frontend       Spring Boot API
                                 │
                         ┌───────┴────────┐
                         │                │
                         ▼                ▼
                    PostgreSQL          Redis
```

**Backend**: Spring Boot 3.3 · Java 21 · Modular monolith  
**Frontend**: React · TypeScript · Vite  
**Database**: PostgreSQL 16 · Flyway migrations  
**Cache**: Redis 7  
**Proxy**: Nginx  
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
# Frontend:  http://localhost:5173
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

```bash
# On the VPS
docker compose -f docker-compose.prod.yml up -d
```

## Project Structure

```
Gymholic/
├── backend/          # Spring Boot API
├── frontend/         # React + Vite
├── nginx/            # Reverse proxy
├── .github/          # CI/CD workflows
├── docker-compose.yml        # Local dev
└── docker-compose.prod.yml   # Production
```

## License

MIT License — see [LICENSE](LICENSE).

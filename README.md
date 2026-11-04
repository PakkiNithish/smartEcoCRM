# smartEco CRM (Simple CRM System)

A modern, full-stack Customer Relationship Management (CRM) platform inspired by Bitrix24's Simple CRM mode. Designed for teams to track leads, manage contacts and companies, customize lifecycle journeys, configure creation forms dynamically, and evaluate organizational performance.

---

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, `@dnd-kit` (Kanban boards & Form Builder), Lucide Icons
- **Backend**: FastAPI (Python 3.11+ ASGI), SQLAlchemy 2.0 (AsyncIO), Alembic migrations, Pydantic v2, SlowAPI rate limiting
- **Database**: PostgreSQL 15 (Production) / SQLite (Local dev)
- **Reverse Proxy**: Nginx (Unified entry on port 80/443)
- **DevOps**: Docker, Docker Compose

---

## 📁 Project Structure

```
├── backend/                  # FastAPI Application
│   ├── alembic/              # Database schema migrations (0001-0007)
│   ├── app/
│   │   ├── api/v1/           # REST endpoints (auth, deals, contacts, companies, etc.)
│   │   ├── core/             # Configuration, security (JWT), rate limiting
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── services/         # Business logic layer
│   ├── Dockerfile            # Production Python container
│   ├── entrypoint.sh         # Migration runner & Gunicorn ASGI launcher
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js 14 Frontend Application
│   ├── src/
│   │   ├── app/              # App Router pages (deals, contacts, companies, admin, reports)
│   │   ├── components/crm/   # CRM UI components (tables, toolbars, side panels, cards)
│   │   ├── lib/              # API client, form defaults, utilities
│   │   └── types/            # TypeScript interfaces
│   ├── Dockerfile            # Production Node.js Alpine container
│   └── package.json          # Node dependencies
├── docker/                   # Reverse proxy & initialization configs
│   ├── nginx/nginx.conf      # Nginx routing configuration
│   └── postgres/init.sql     # PostgreSQL extension initialization
├── docker-compose.yml        # Development & local build orchestration
├── docker-compose.prod.yml   # Production orchestration (pulls from Docker Hub)
└── .env.example              # Environment variable template
```

---

## ⚡ Quick Start with Docker

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Run with Docker Compose
```bash
docker compose up --build -d
```

### 3. Access the Application
- **Web Application**: [http://localhost](http://localhost) (or [http://localhost:3000](http://localhost:3000))
- **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

*Note: The first user registered on a clean database is automatically assigned the `admin` role.*

---

## 🛠 Local Development Setup (Without Docker)

### Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📦 Production Deployment with Docker Hub

1. **Build & Tag Images**:
   ```bash
   docker build -t <your-dockerhub-username>/crm-backend:latest ./backend
   docker build -t <your-dockerhub-username>/crm-frontend:latest ./frontend
   ```

2. **Push to Docker Hub**:
   ```bash
   docker push <your-dockerhub-username>/crm-backend:latest
   docker push <your-dockerhub-username>/crm-frontend:latest
   ```

3. **Deploy on Server**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```


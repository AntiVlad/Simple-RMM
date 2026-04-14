# Simple RMM

A lightweight Remote Monitoring & Management system with a FastAPI backend, Next.js dashboard, and Go-based endpoint agent.

## Quick Start (Server)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Option A: One-Click
Double-click **`deploy.bat`** — it handles everything automatically.

### Option B: Manual
```bash
# 1. Configure credentials
copy .env.example .env
# Edit .env with your preferred passwords/keys

# 2. Start all services
docker compose up -d --build

# 3. Open the dashboard
start http://localhost:3000
```

### Stopping / Restarting
```bash
docker compose down          # Stop everything
docker compose up -d         # Restart
docker compose logs -f       # View live logs
docker compose up -d --build # Rebuild after code changes
```

---

## Agent Deployment (Endpoints)

The agent runs natively on target Windows PCs and connects back to your RMM server.

### Building the Agent
**Prerequisites:** Go 1.21+

```bash
# Run the build script (or double-click build_rmm.bat)
build_rmm.bat
```

### Installing on Endpoints
Copy these two files to the target PC:
- `rmm_agent.exe`
- `install_agent.bat`

Run `install_agent.bat` as Administrator. The agent will:
1. Install to `C:\Program Files\RMM Agent\`
2. Register as a startup task (runs at logon with admin privileges)
3. Prompt for your server URL and API key on first launch

To remove: run `uninstall_agent.bat` as Administrator.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Docker Compose (Server Machine)                │
│                                                 │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Postgres  │◄─│  Backend  │◄─│  Frontend  │  │
│  │ :5432     │  │  :8080    │  │  :3000     │  │
│  └───────────┘  └───────────┘  └────────────┘  │
└─────────────────────────────────────────────────┘
        ▲                ▲
        │                │
   ┌────┴────┐     ┌─────┴─────┐
   │ Agent 1 │     │  Agent N  │   (Endpoint PCs)
   └─────────┘     └───────────┘
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `POSTGRES_USER` | Database username | `rmm_user` |
| `POSTGRES_PASSWORD` | Database password | `rmm_password` |
| `POSTGRES_DB` | Database name | `rmm_db` |
| `AGENT_API_KEY` | Shared secret for agent ↔ server auth | — |
| `DASHBOARD_PASSWORD` | Login password for the web dashboard | — |
| `JWT_SECRET` | Secret key for session tokens | — |

## Development (Native)

If you want to run without Docker for development:

```bash
# Terminal 1: Database
docker compose up db -d

# Terminal 2: Backend
cd backend
pip install -r requirements.txt
set DB_HOST=localhost
set DB_PORT=5432
python main.py

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

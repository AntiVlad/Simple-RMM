# Simple RMM

A lightweight Remote Monitoring & Management system with a FastAPI backend, Next.js dashboard, and Go-based Windows endpoint agent.

## Features

- **Centralized Dashboard**: Real-time overview of managed endpoints, online/offline status, and system telemetry.
- **Script Deployment**: Execute PowerShell and Batch commands remotely across endpoints with live output streaming.
- **Audit & History**: Full audit trail of script executions, outputs, and system events.
- **Credential Vault**: Encrypted credential storage for administrative tasks.
- **Lightweight Windows Agent**: Low-footprint Go binary that runs as a scheduled startup task on managed nodes.

---

## Quick Start (Server)

**Prerequisites**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Option A: One-Click Deployment
Double-click `deploy.bat` — it handles setup and container startup automatically.

### Option B: Manual Setup
```bash
# 1. Configure credentials
cp .env.example .env
# Edit .env with your desired credentials and secrets

# 2. Start all services
docker compose up -d --build

# 3. Open the dashboard
# Navigate to http://localhost:3000 in your browser
```

### Managing Containers
```bash
docker compose down          # Stop all services
docker compose up -d         # Restart services
docker compose logs -f       # View live logs
docker compose up -d --build # Rebuild after updates
```

---

## Agent Deployment (Endpoints)

The agent runs natively on target Windows machines and reports back to your Simple-RMM server.

### Building the Agent
**Prerequisites**: Go 1.21+

```bash
# Run the automated build script (or double-click build_rmm.bat)
./build_rmm.bat
```

### Installing on Endpoints
Copy the following files to the target machine:
- `rmm_agent.exe`
- `install_agent.bat`

Run `install_agent.bat` as **Administrator**. The installer will:
1. Copy the binary to `C:\Program Files\RMM Agent\`
2. Register the service as a scheduled startup task with elevated privileges
3. Prompt for server URL and API key on first launch

To uninstall, run `uninstall_agent.bat` as Administrator.

---

## Architecture

```text
+-------------------------------------------------------------+
|               Docker Compose (Server Machine)               |
|                                                             |
|   +------------+       +------------+       +-----------+   |
|   | PostgreSQL | <---> |  Backend   | <---> | Frontend  |   |
|   |   :5432    |       |   :8080    |       |   :3000   |   |
|   +------------+       +------------+       +-----------+   |
+-------------------------------------------------------------+
                            ^           ^
                            |           |
                   +--------+           +--------+
                   |                             |
          +-----------------+           +-----------------+
          | Endpoint Node 1 |           | Endpoint Node N |
          |   (rmm_agent)   |           |   (rmm_agent)   |
          +-----------------+           +-----------------+
```

---

## Environment Variables

| Variable | Description | Default |
|:---|:---|:---|
| `POSTGRES_USER` | Database username | `rmm_user` |
| `POSTGRES_PASSWORD` | Database password | `rmm_password` |
| `POSTGRES_DB` | Database name | `rmm_db` |
| `AGENT_API_KEY` | Shared secret for agent-server authentication | — |
| `DASHBOARD_PASSWORD` | Login password for the web dashboard | — |
| `JWT_SECRET` | Secret key used to sign session tokens | — |

---

## Native Development Setup (Without Docker)

```bash
# 1. Start Database
docker compose up db -d

# 2. Start Backend
cd backend
pip install -r requirements.txt
export DB_HOST=localhost DB_PORT=5432
python main.py

# 3. Start Frontend
cd frontend
npm install
npm run dev
```

## License

This project is licensed under the MIT License.

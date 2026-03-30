# Simple rmm

- `cd agent && go run main.go` to run the agent
- `cd backend && python main.py` to run the backend
- Make sure a postgres server is running on port 5432, you can use `docker-compose up -d` to run it.
- `cd frontend && npm run dev` to run the frontend
- `go build -ldflags "-H=windowsgui -s -w" -o agent.exe main.go` to build the agent

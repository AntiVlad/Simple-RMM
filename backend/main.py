from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import sys
import multiprocessing

from database import engine, Base
from sqlalchemy import text
import models
import schemas
from routers import agent_api, web_api

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any new database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Run lightweight migrations for columns added after initial deployment
    async with engine.begin() as conn:
        try:
            # Add created_at if missing
            await conn.execute(text(
                "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"
            ))
            # Add command if missing (for remote command execution)
            await conn.execute(text(
                "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS command TEXT"
            ))
            # Add custom_args if missing (for deployment overrides)
            await conn.execute(text(
                "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_args TEXT"
            ))
            # Ensure package_id is nullable (it should be by default but just in case)
            await conn.execute(text(
                "ALTER TABLE tasks ALTER COLUMN package_id DROP NOT NULL"
            ))
        except Exception:
            pass
        
        # Fix old hardcoded localhost download URLs → relative paths
        try:
            await conn.execute(text(
                "UPDATE software_packages SET download_url = REPLACE(download_url, 'http://localhost:8080', '') WHERE download_url LIKE 'http://localhost:8080%'"
            ))
            await conn.execute(text(
                "UPDATE software_packages SET download_url = REPLACE(download_url, 'http://localhost:8000', '') WHERE download_url LIKE 'http://localhost:8000%'"
            ))
        except Exception:
            pass
    yield

app = FastAPI(
    title="Endpoint Management System API",
    description="Backend API for managing software deployment to PCs",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve uploads directory relative to the executable, not the CWD
if getattr(sys, 'frozen', False):
    _base_dir = os.path.dirname(sys.executable)
else:
    _base_dir = os.path.dirname(os.path.abspath(__file__))

_uploads_dir = os.path.join(_base_dir, "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/downloads", StaticFiles(directory=_uploads_dir), name="downloads")

@app.get("/")
async def root():
    return {"message": "Welcome to the Endpoint Management System API!"}

app.include_router(agent_api.router)
app.include_router(web_api.router)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    uvicorn.run(app, host="0.0.0.0", port=8080, reload=False)

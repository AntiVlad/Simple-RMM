from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from database import engine, Base
import models
import schemas
from routers import agent_api, web_api

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Endpoint Management System API",
    description="Backend API for managing software deployment to PCs",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/downloads", StaticFiles(directory="uploads"), name="downloads")

@app.get("/")
async def root():
    return {"message": "Welcome to the Endpoint Management System API!"}

app.include_router(agent_api.router)
app.include_router(web_api.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

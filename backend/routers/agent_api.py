import uuid
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from typing import Optional
from pydantic import BaseModel

from database import get_db
from models import Agent, Task, TaskStatus
import schemas

API_KEY = os.getenv("AGENT_API_KEY", "123")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Could not validate API Key"
        )
    return api_key

router = APIRouter(tags=["Agent API"], dependencies=[Depends(verify_api_key)])

class TaskResultPayload(BaseModel):
    status: str
    logs: Optional[str] = None

@router.post("/api/agent/register", response_model=schemas.AgentResponse)
async def register_agent(agent_data: schemas.AgentCreate, db: AsyncSession = Depends(get_db)):
    query = select(Agent).where(Agent.hostname == agent_data.hostname)
    result = await db.execute(query)
    existing_agent = result.scalar_one_or_none()
    
    if existing_agent:
    # Update existing agent
        existing_agent.ip_address = agent_data.ip_address
        existing_agent.os_version = agent_data.os_version
        existing_agent.last_seen = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing_agent)
        return existing_agent
        
    new_agent = Agent(
        hostname=agent_data.hostname,
        os_version=agent_data.os_version,
        ip_address=agent_data.ip_address,
        last_seen=datetime.now(timezone.utc)
    )
    db.add(new_agent)
    await db.commit()
    await db.refresh(new_agent)
    return new_agent

@router.post("/api/agent/{agent_id}/heartbeat")
async def agent_heartbeat(agent_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    query = select(Agent).where(Agent.id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    # Update last_seen timestamp
    agent.last_seen = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ok", "message": "Heartbeat recorded"}

@router.get("/api/agent/{agent_id}/tasks", response_model=Optional[schemas.TaskResponseWithPackage])
async def get_agent_tasks(agent_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    query = select(Task).options(joinedload(Task.package)).where(
        Task.agent_id == agent_id,
        Task.status == TaskStatus.PENDING
    ).limit(1)
    
    result = await db.execute(query)
    task = result.scalar_one_or_none()
    
    if not task:
        return None
        
    # Update status to IN_PROGRESS
    task.status = TaskStatus.IN_PROGRESS
    await db.commit()
    await db.refresh(task)
    return task

@router.post("/api/agent/tasks/{task_id}/result")
async def submit_task_result(task_id: uuid.UUID, result_data: TaskResultPayload, db: AsyncSession = Depends(get_db)):
    if result_data.status not in ("SUCCESS", "FAILED"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'SUCCESS' or 'FAILED'.")
        
    query = select(Task).where(Task.id == task_id)
    result = await db.execute(query)
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = TaskStatus.SUCCESS if result_data.status == "SUCCESS" else TaskStatus.FAILED
    task.logs = result_data.logs
    
    await db.commit()
    return {"status": "ok", "message": "Result updated"}

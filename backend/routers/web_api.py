import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from database import get_db
from models import Agent, SoftwarePackage, Task, TaskStatus
import schemas

router = APIRouter(tags=["Web Dashboard API"])

@router.get("/api/web/agents", response_model=List[schemas.AgentResponse])
async def get_all_agents(db: AsyncSession = Depends(get_db)):
    query = select(Agent)
    result = await db.execute(query)
    agents = result.scalars().all()
    return agents

@router.post("/api/web/software", response_model=schemas.SoftwarePackageResponse)
async def create_software_package(package_data: schemas.SoftwarePackageCreate, db: AsyncSession = Depends(get_db)):
    new_package = SoftwarePackage(
        name=package_data.name,
        download_url=package_data.download_url,
        silent_args=package_data.silent_args
    )
    db.add(new_package)
    await db.commit()
    await db.refresh(new_package)
    return new_package

@router.post("/api/web/software/upload", response_model=schemas.SoftwarePackageResponse)
async def upload_software_package(
    name: str = Form(...),
    silent_args: str = Form(""),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")
        
    file_path = f"uploads/{file.filename}"
    
    # Save the physical file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    download_url = f"http://localhost:8000/downloads/{file.filename}"
    
    new_package = SoftwarePackage(
        name=name,
        download_url=download_url,
        silent_args=silent_args
    )
    db.add(new_package)
    await db.commit()
    await db.refresh(new_package)
    return new_package

@router.get("/api/web/software", response_model=List[schemas.SoftwarePackageResponse])
async def get_all_software(db: AsyncSession = Depends(get_db)):
    query = select(SoftwarePackage)
    result = await db.execute(query)
    packages = result.scalars().all()
    return packages

@router.post("/api/web/tasks", response_model=schemas.TaskResponse)
async def create_task(task_data: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    # 1. Verify agent exists
    agent_query = select(Agent).where(Agent.id == task_data.agent_id)
    agent_result = await db.execute(agent_query)
    if not agent_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Agent not found")
        
    # 2. Verify software package exists
    package_query = select(SoftwarePackage).where(SoftwarePackage.id == task_data.package_id)
    package_result = await db.execute(package_query)
    if not package_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Software package not found")
        
    # 3. Create Task
    new_task = Task(
        agent_id=task_data.agent_id,
        package_id=task_data.package_id,
        status=TaskStatus.PENDING
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task

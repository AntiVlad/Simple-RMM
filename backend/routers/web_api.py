import uuid
import os
import sys
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from typing import List

from database import get_db
from models import Agent, SoftwarePackage, Task, TaskStatus
import schemas

if getattr(sys, 'frozen', False):
    _base_dir = os.path.dirname(sys.executable)
else:
    _base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_uploads_dir = os.path.join(_base_dir, "uploads")

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
        
    file_path = os.path.join(_uploads_dir, file.filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Store relative path — the agent will resolve it against its configured server URL
    download_url = f"/downloads/{file.filename}"
    
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

@router.delete("/api/web/software/{package_id}")
async def delete_software_package(package_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    query = select(SoftwarePackage).where(SoftwarePackage.id == package_id)
    result = await db.execute(query)
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Software package not found")
    
    # Delete physical file if it exists
    if package.download_url.startswith("/downloads/"):
        filename = package.download_url.replace("/downloads/", "")
        filepath = os.path.join(_uploads_dir, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    
    await db.delete(package)
    await db.commit()
    return {"status": "ok", "message": "Package deleted"}


@router.post("/api/web/tasks", response_model=schemas.TaskResponse)
async def create_task(task_data: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    agent_query = select(Agent).where(Agent.id == task_data.agent_id)
    agent_result = await db.execute(agent_query)
    if not agent_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Agent not found")
        
    package_query = select(SoftwarePackage).where(SoftwarePackage.id == task_data.package_id)
    package_result = await db.execute(package_query)
    if not package_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Software package not found")
        
    new_task = Task(
        agent_id=task_data.agent_id,
        package_id=task_data.package_id,
        status=TaskStatus.PENDING
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task

@router.post("/api/web/tasks/bulk")
async def create_bulk_tasks(bulk_data: schemas.BulkTaskCreate, db: AsyncSession = Depends(get_db)):
    """Deploy multiple packages to multiple agents at once."""
    if not bulk_data.agent_ids or not bulk_data.package_ids:
        raise HTTPException(status_code=400, detail="Must select at least one agent and one package")

    # Validate all agents exist
    agent_query = select(Agent).where(Agent.id.in_(bulk_data.agent_ids))
    agent_result = await db.execute(agent_query)
    found_agents = agent_result.scalars().all()
    if len(found_agents) != len(bulk_data.agent_ids):
        raise HTTPException(status_code=404, detail="One or more agents not found")

    # Validate all packages exist
    pkg_query = select(SoftwarePackage).where(SoftwarePackage.id.in_(bulk_data.package_ids))
    pkg_result = await db.execute(pkg_query)
    found_packages = pkg_result.scalars().all()
    if len(found_packages) != len(bulk_data.package_ids):
        raise HTTPException(status_code=404, detail="One or more packages not found")

    created_tasks = []
    for agent_id in bulk_data.agent_ids:
        for package_id in bulk_data.package_ids:
            new_task = Task(
                agent_id=agent_id,
                package_id=package_id,
                custom_args=bulk_data.custom_args,
                status=TaskStatus.PENDING
            )
            db.add(new_task)
            created_tasks.append(new_task)

    await db.commit()
    return {"status": "ok", "tasks_created": len(created_tasks)}


@router.put("/api/web/software/{pkg_id}")
async def update_software_package(pkg_id: uuid.UUID, update_data: schemas.SoftwarePackageUpdate, db: AsyncSession = Depends(get_db)):
    """Update metadata for an existing software package."""
    query = select(SoftwarePackage).where(SoftwarePackage.id == pkg_id)
    result = await db.execute(query)
    pkg = result.scalar_one_or_none()
    
    if not pkg:
        raise HTTPException(status_code=404, detail="Software package not found")
        
    if update_data.name is not None:
        pkg.name = update_data.name
    if update_data.silent_args is not None:
        pkg.silent_args = update_data.silent_args
        
    await db.commit()
    return {"status": "ok"}


@router.post("/api/web/commands/bulk")
async def create_bulk_commands(cmd_data: schemas.BulkCommandCreate, db: AsyncSession = Depends(get_db)):
    """Send a shell command to multiple agents at once."""
    if not cmd_data.agent_ids or not cmd_data.command.strip():
        raise HTTPException(status_code=400, detail="Must select at least one agent and provide a command")

    # Validate agents exist
    agent_query = select(Agent).where(Agent.id.in_(cmd_data.agent_ids))
    agent_result = await db.execute(agent_query)
    found_agents = agent_result.scalars().all()
    if len(found_agents) != len(cmd_data.agent_ids):
        raise HTTPException(status_code=404, detail="One or more agents not found")

    created_tasks = []
    for agent_id in cmd_data.agent_ids:
        new_task = Task(
            agent_id=agent_id,
            command=cmd_data.command.strip(),
            status=TaskStatus.PENDING
        )
        db.add(new_task)
        created_tasks.append(new_task)

    await db.commit()
    return {"status": "ok", "tasks_created": len(created_tasks)}

@router.get("/api/web/tasks", response_model=List[schemas.TaskResponseFull])
async def get_all_tasks(db: AsyncSession = Depends(get_db)):
    """Get all tasks with agent and package details for the history view."""
    query = select(Task).options(
        joinedload(Task.agent),
        joinedload(Task.package)
    ).order_by(Task.created_at.desc())
    result = await db.execute(query)
    tasks = result.unique().scalars().all()
    return tasks

import uuid
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict, computed_field
from typing import Optional

from models import TaskStatus

# --- Agent Schemas ---

class AgentBase(BaseModel):
    hostname: str
    os_version: str
    ip_address: str

class AgentCreate(AgentBase):
    pass

class AgentResponse(AgentBase):
    id: uuid.UUID
    last_seen: datetime

    model_config = ConfigDict(from_attributes=True)
    
    @computed_field
    @property
    def is_online(self) -> bool:
        now = datetime.now(timezone.utc)
        seen = self.last_seen if self.last_seen.tzinfo else self.last_seen.replace(tzinfo=timezone.utc)
        return (now - seen) <= timedelta(minutes=5)

# --- SoftwarePackage Schemas ---

class SoftwarePackageBase(BaseModel):
    name: str
    download_url: str
    silent_args: str

class SoftwarePackageCreate(SoftwarePackageBase):
    pass

class SoftwarePackageResponse(SoftwarePackageBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# --- Task Schemas ---

class TaskBase(BaseModel):
    agent_id: uuid.UUID
    package_id: uuid.UUID
    status: Optional[TaskStatus] = TaskStatus.PENDING
    logs: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

class TaskResponseWithPackage(TaskResponse):
    package: SoftwarePackageResponse


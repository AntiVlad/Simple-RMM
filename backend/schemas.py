import uuid
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict, computed_field
from typing import Optional, List

from models import TaskStatus


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


class SoftwarePackageBase(BaseModel):
    name: str
    download_url: str
    silent_args: str

class SoftwarePackageCreate(SoftwarePackageBase):
    pass

class SoftwarePackageResponse(SoftwarePackageBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)
class SoftwarePackageUpdate(BaseModel):
    name: Optional[str] = None
    silent_args: Optional[str] = None


class TaskBase(BaseModel):
    agent_id: uuid.UUID
    package_id: Optional[uuid.UUID] = None
    command: Optional[str] = None
    custom_args: Optional[str] = None
    status: Optional[TaskStatus] = TaskStatus.PENDING
    logs: Optional[str] = None

class TaskCreate(BaseModel):
    agent_id: uuid.UUID
    package_id: uuid.UUID

class BulkTaskCreate(BaseModel):
    agent_ids: List[uuid.UUID]
    package_ids: List[uuid.UUID]
    custom_args: Optional[str] = None

class BulkCommandCreate(BaseModel):
    agent_ids: List[uuid.UUID]
    command: str

class TaskResponse(TaskBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TaskResponseWithPackage(TaskResponse):
    package: Optional[SoftwarePackageResponse] = None

class TaskResponseFull(TaskResponse):
    package: Optional[SoftwarePackageResponse] = None
    agent: AgentResponse


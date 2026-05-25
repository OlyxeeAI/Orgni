from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class AgentStatus(str, Enum):
    idle = "idle"
    active = "active"
    busy = "busy"
    offline = "offline"


class TaskStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class AgentBase(SQLModel):
    name: str
    role: str
    capabilities: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    extra_data: Optional[Any] = Field(default=None, sa_column=Column(JSON))


class Agent(AgentBase, table=True):
    __tablename__ = "agents"
    id: Optional[int] = Field(default=None, primary_key=True)
    status: AgentStatus = Field(default=AgentStatus.idle)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgentCreate(AgentBase):
    pass


class AgentRead(AgentBase):
    id: int
    status: AgentStatus
    created_at: datetime
    updated_at: datetime


class AgentTaskBase(SQLModel):
    agent_id: Optional[int] = Field(default=None, foreign_key="agents.id")
    workflow_id: Optional[int] = Field(default=None, foreign_key="workflows.id")
    task_type: str
    description: str
    input_data: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    priority: int = Field(default=5)


class AgentTask(AgentTaskBase, table=True):
    __tablename__ = "agent_tasks"
    id: Optional[int] = Field(default=None, primary_key=True)
    status: TaskStatus = Field(default=TaskStatus.queued)
    output_data: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class AgentTaskCreate(AgentTaskBase):
    pass


class AgentTaskRead(AgentTaskBase):
    id: int
    status: TaskStatus
    output_data: Optional[Any]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
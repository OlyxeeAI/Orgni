from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class WorkflowStatus(str, Enum):
    pending = "pending"
    running = "running"
    paused = "paused"
    completed = "completed"
    failed = "failed"


class WorkflowBase(SQLModel):
    name: str
    description: Optional[str] = None
    entity_id: Optional[int] = Field(default=None, foreign_key="entities.id")
    steps: Optional[Any] = Field(default=None, sa_column=Column(JSON))


class Workflow(WorkflowBase, table=True):
    __tablename__ = "workflows"
    id: Optional[int] = Field(default=None, primary_key=True)
    status: WorkflowStatus = Field(default=WorkflowStatus.pending)
    current_step: Optional[str] = None
    execution_history: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowRead(WorkflowBase):
    id: int
    status: WorkflowStatus
    current_step: Optional[str]
    execution_history: Optional[Any]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


class WorkflowUpdate(SQLModel):
    status: Optional[WorkflowStatus] = None
    current_step: Optional[str] = None
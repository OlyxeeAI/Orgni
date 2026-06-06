from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class WorkflowState(SQLModel, table=True):
    __tablename__ = "workflow_states"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_name: str
    step_name: str
    step_number: Optional[int] = None
    operational_state: str
    state_context: Optional[str] = None
    workflow_id: Optional[int] = Field(default=None, foreign_key="workflows.id")
    extracted_from_event_id: Optional[int] = Field(default=None, foreign_key="ingestion_events.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
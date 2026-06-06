from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class EnterpriseDecision(SQLModel, table=True):
    __tablename__ = "enterprise_decisions"

    id: Optional[int] = Field(default=None, primary_key=True)
    decision_type: str
    decision_text: str
    decided_by: Optional[str] = None
    decision_target: Optional[str] = None
    status: str = "confirmed"
    confidence: Optional[float] = None
    extracted_from_event_id: Optional[int] = Field(default=None, foreign_key="ingestion_events.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class IngestionStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class IngestionEventBase(SQLModel):
    source: str
    event_type: str
    raw_content: str


class IngestionEvent(IngestionEventBase, table=True):
    __tablename__ = "ingestion_events"
    id: Optional[int] = Field(default=None, primary_key=True)
    status: IngestionStatus = Field(default=IngestionStatus.pending)
    extracted_entities: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None


class IngestionEventCreate(IngestionEventBase):
    pass


class IngestionEventRead(IngestionEventBase):
    id: int
    status: IngestionStatus
    extracted_entities: Optional[Any]
    error_message: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
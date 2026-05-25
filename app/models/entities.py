from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class EntityType(str, Enum):
    person = "person"
    team = "team"
    system = "system"
    document = "document"
    process = "process"
    policy = "policy"
    event = "event"


class EntityBase(SQLModel):
    name: str = Field(index=True)
    type: EntityType
    description: Optional[str] = None
    extra_data: Optional[Any] = Field(default=None, sa_column=Column(JSON))


class Entity(EntityBase, table=True):
    __tablename__ = "entities"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class EntityCreate(EntityBase):
    pass


class EntityRead(EntityBase):
    id: int
    created_at: datetime
    updated_at: datetime


class EntityUpdate(SQLModel):
    name: Optional[str] = None
    type: Optional[EntityType] = None
    description: Optional[str] = None
    extra_data: Optional[Any] = None
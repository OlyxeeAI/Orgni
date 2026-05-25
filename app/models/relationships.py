from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Any
from datetime import datetime


class RelationshipBase(SQLModel):
    from_entity_id: int = Field(foreign_key="entities.id")
    to_entity_id: int = Field(foreign_key="entities.id")
    relationship_type: str
    extra_data: Optional[Any] = Field(default=None, sa_column=Column(JSON))


class Relationship(RelationshipBase, table=True):
    __tablename__ = "relationships"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RelationshipCreate(RelationshipBase):
    pass


class RelationshipRead(RelationshipBase):
    id: int
    created_at: datetime
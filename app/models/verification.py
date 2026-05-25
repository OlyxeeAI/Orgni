from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class VerificationStatus(str, Enum):
    passed = "passed"
    failed = "failed"
    warning = "warning"


class VerificationRuleBase(SQLModel):
    name: str
    description: Optional[str] = None
    rule_type: str
    condition: str
    severity: str = Field(default="warning")
    is_active: bool = Field(default=True)


class VerificationRule(VerificationRuleBase, table=True):
    __tablename__ = "verification_rules"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VerificationRuleCreate(VerificationRuleBase):
    pass


class VerificationRuleRead(VerificationRuleBase):
    id: int
    created_at: datetime


class VerificationResultBase(SQLModel):
    rule_id: Optional[int] = Field(default=None, foreign_key="verification_rules.id")
    workflow_id: Optional[int] = Field(default=None, foreign_key="workflows.id")
    entity_id: Optional[int] = Field(default=None, foreign_key="entities.id")
    status: VerificationStatus
    details: Optional[str] = None


class VerificationResult(VerificationResultBase, table=True):
    __tablename__ = "verification_results"
    id: Optional[int] = Field(default=None, primary_key=True)
    checked_at: datetime = Field(default_factory=datetime.utcnow)


class VerificationResultCreate(VerificationResultBase):
    pass


class VerificationResultRead(VerificationResultBase):
    id: int
    checked_at: datetime
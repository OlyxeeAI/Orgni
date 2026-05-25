from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.verification import (
    VerificationRule, VerificationRuleCreate, VerificationRuleRead,
    VerificationResult, VerificationResultCreate, VerificationResultRead
)

router = APIRouter(prefix="/verification", tags=["Verification"])


@router.get("/rules", response_model=list[VerificationRuleRead])
def list_rules(session: Session = Depends(get_session)):
    return session.exec(select(VerificationRule)).all()


@router.post("/rules", response_model=VerificationRuleRead, status_code=201)
def create_rule(rule: VerificationRuleCreate, session: Session = Depends(get_session)):
    db_rule = VerificationRule.model_validate(rule)
    session.add(db_rule)
    session.commit()
    session.refresh(db_rule)
    return db_rule


@router.get("/rules/{rule_id}", response_model=VerificationRuleRead)
def get_rule(rule_id: int, session: Session = Depends(get_session)):
    rule = session.get(VerificationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: int, session: Session = Depends(get_session)):
    rule = session.get(VerificationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    session.delete(rule)
    session.commit()


@router.get("/results", response_model=list[VerificationResultRead])
def list_results(session: Session = Depends(get_session)):
    return session.exec(select(VerificationResult)).all()


@router.post("/results", response_model=VerificationResultRead, status_code=201)
def create_result(result: VerificationResultCreate, session: Session = Depends(get_session)):
    db_result = VerificationResult.model_validate(result)
    session.add(db_result)
    session.commit()
    session.refresh(db_result)
    return db_result
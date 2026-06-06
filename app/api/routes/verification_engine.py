from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.agents.verification_agent import (
    run_verification_for_entity,
    run_verification_for_workflow,
    run_all_verifications
)

router = APIRouter(prefix="/verification-engine", tags=["Verification Engine"])


@router.post("/run-all")
async def run_all(session: Session = Depends(get_session)):
    return await run_all_verifications(session)


@router.post("/entity/{entity_id}")
async def verify_entity(entity_id: int, session: Session = Depends(get_session)):
    result = await run_verification_for_entity(entity_id, session)
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/workflow/{workflow_id}")
async def verify_workflow(workflow_id: int, session: Session = Depends(get_session)):
    result = await run_verification_for_workflow(workflow_id, session)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/compliance-report")
async def compliance_report(session: Session = Depends(get_session)):
    return await run_all_verifications(session)


@router.get("/entity/{entity_id}/score")
async def entity_score(entity_id: int, session: Session = Depends(get_session)):
    result = await run_verification_for_entity(entity_id, session)
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result["error"])
    return {
        "entity_id": entity_id,
        "entity_name": result.get("entity_name"),
        "compliance_score": result.get("compliance_score"),
        "status": result.get("status"),
        "risk_level": (
            "HIGH" if result.get("status") == "non_compliant" else
            "MEDIUM" if result.get("status") == "compliant_with_warnings" else
            "LOW"
        )
    }


@router.get("/results")
def list_all_results(session: Session = Depends(get_session)):
    from app.models.verification import VerificationResult
    results = session.exec(select(VerificationResult)).all()
    return results
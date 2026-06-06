from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.database import get_session
from app.agents.workflow_agent import run_workflow, run_all_workflows

router = APIRouter(prefix="/workflow-agent", tags=["Workflow Automation Agent"])


@router.post("/run/{workflow_id}")
async def advance_workflow(workflow_id: int, session: Session = Depends(get_session)):
    result = await run_workflow(workflow_id, session)
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/run-all")
async def advance_all_workflows(session: Session = Depends(get_session)):
    return await run_all_workflows(session)


@router.get("/status/{workflow_id}")
def get_workflow_status(workflow_id: int, session: Session = Depends(get_session)):
    from app.models.workflows import Workflow
    from app.models.workflow_state import WorkflowState
    from sqlmodel import select

    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")

    states = session.exec(
        select(WorkflowState).where(WorkflowState.workflow_id == workflow_id)
    ).all()

    return {
        "workflow_id": workflow_id,
        "name": workflow.name,
        "status": workflow.status,
        "steps": workflow.steps,
        "state_history": [
            {
                "step": s.step_name,
                "state": s.operational_state,
                "context": s.state_context,
                "timestamp": s.created_at.isoformat()
            }
            for s in states
        ]
    }
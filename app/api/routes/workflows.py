from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.workflows import Workflow, WorkflowCreate, WorkflowRead, WorkflowUpdate, WorkflowStatus
from datetime import datetime

router = APIRouter(prefix="/workflows", tags=["Workflows"])


@router.get("/", response_model=list[WorkflowRead])
def list_workflows(session: Session = Depends(get_session)):
    return session.exec(select(Workflow)).all()


@router.post("/", response_model=WorkflowRead, status_code=201)
def create_workflow(workflow: WorkflowCreate, session: Session = Depends(get_session)):
    db_workflow = Workflow.model_validate(workflow)
    session.add(db_workflow)
    session.commit()
    session.refresh(db_workflow)
    return db_workflow


@router.get("/{workflow_id}", response_model=WorkflowRead)
def get_workflow(workflow_id: int, session: Session = Depends(get_session)):
    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.patch("/{workflow_id}", response_model=WorkflowRead)
def update_workflow(workflow_id: int, updates: WorkflowUpdate, session: Session = Depends(get_session)):
    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workflow, key, value)
    workflow.updated_at = datetime.utcnow()
    if updates.status == WorkflowStatus.completed:
        workflow.completed_at = datetime.utcnow()
    session.add(workflow)
    session.commit()
    session.refresh(workflow)
    return workflow


@router.delete("/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: int, session: Session = Depends(get_session)):
    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    session.delete(workflow)
    session.commit()
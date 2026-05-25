from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.agents import Agent, AgentCreate, AgentRead, AgentTask, AgentTaskCreate, AgentTaskRead, AgentStatus, TaskStatus
from datetime import datetime

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get("/", response_model=list[AgentRead])
def list_agents(session: Session = Depends(get_session)):
    return session.exec(select(Agent)).all()


@router.post("/", response_model=AgentRead, status_code=201)
def register_agent(agent: AgentCreate, session: Session = Depends(get_session)):
    db_agent = Agent.model_validate(agent)
    session.add(db_agent)
    session.commit()
    session.refresh(db_agent)
    return db_agent


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: int, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}/status", response_model=AgentRead)
def update_agent_status(agent_id: int, status: AgentStatus, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = status
    agent.updated_at = datetime.utcnow()
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=204)
def delete_agent(agent_id: int, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    session.delete(agent)
    session.commit()


# ── Agent Tasks ──

@router.get("/tasks/all", response_model=list[AgentTaskRead])
def list_tasks(session: Session = Depends(get_session)):
    return session.exec(select(AgentTask)).all()


@router.post("/tasks", response_model=AgentTaskRead, status_code=201)
def create_task(task: AgentTaskCreate, session: Session = Depends(get_session)):
    db_task = AgentTask.model_validate(task)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@router.patch("/tasks/{task_id}/status", response_model=AgentTaskRead)
def update_task_status(task_id: int, status: TaskStatus, session: Session = Depends(get_session)):
    task = session.get(AgentTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = status
    task.updated_at = datetime.utcnow()
    if status == TaskStatus.completed or status == TaskStatus.failed:
        task.completed_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)
    return task
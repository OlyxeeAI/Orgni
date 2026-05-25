from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.core.database import get_session
from app.models.entities import Entity
from app.models.workflows import Workflow, WorkflowStatus
from app.models.agents import Agent, AgentTask
from app.models.ingestion import IngestionEvent, IngestionStatus
from app.models.verification import VerificationResult, VerificationStatus
from app.models.relationships import Relationship

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_summary(session: Session = Depends(get_session)):
    total_entities = session.exec(select(func.count(Entity.id))).one()
    total_relationships = session.exec(select(func.count(Relationship.id))).one()
    total_workflows = session.exec(select(func.count(Workflow.id))).one()
    running_workflows = session.exec(
        select(func.count(Workflow.id)).where(Workflow.status == WorkflowStatus.running)
    ).one()
    total_agents = session.exec(select(func.count(Agent.id))).one()
    pending_tasks = session.exec(
        select(func.count(AgentTask.id))
    ).one()
    pending_events = session.exec(
        select(func.count(IngestionEvent.id)).where(IngestionEvent.status == IngestionStatus.pending)
    ).one()
    failed_verifications = session.exec(
        select(func.count(VerificationResult.id)).where(VerificationResult.status == VerificationStatus.failed)
    ).one()

    return {
        "memory_graph": {
            "total_entities": total_entities,
            "total_relationships": total_relationships
        },
        "workflows": {
            "total": total_workflows,
            "running": running_workflows
        },
        "agents": {
            "total": total_agents,
            "pending_tasks": pending_tasks
        },
        "ingestion": {
            "pending_events": pending_events
        },
        "verification": {
            "failed_checks": failed_verifications
        }
    }


@router.get("/memory-graph")
def get_memory_graph(session: Session = Depends(get_session)):
    entities = session.exec(select(Entity)).all()
    relationships = session.exec(select(Relationship)).all()

    nodes = [
        {"id": e.id, "label": e.name, "type": e.type, "description": e.description}
        for e in entities
    ]
    edges = [
        {"id": r.id, "from": r.from_entity_id, "to": r.to_entity_id, "label": r.relationship_type}
        for r in relationships
    ]

    return {"nodes": nodes, "edges": edges}
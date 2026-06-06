from fastapi import FastAPI
from app.api.routes import memory as memory_router
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.database import create_db_and_tables
from app.models import entities, relationships, ingestion, workflows, agents, verification
from app.models.workflow_state import WorkflowState
from app.models.enterprise_decision import EnterpriseDecision
from app.api.routes import (
    entities as entities_router,
    relationships as relationships_router,
    ingestion as ingestion_router,
    workflows as workflows_router,
    agents as agents_router,
    verification as verification_router,
    dashboard as dashboard_router,
    workflow_agent as workflow_agent_router,
)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    print("✓ Database tables created")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Enterprise Cognition Infrastructure",
    lifespan=lifespan
)

app.include_router(entities_router.router)
app.include_router(relationships_router.router)
app.include_router(ingestion_router.router)
app.include_router(workflows_router.router)
app.include_router(agents_router.router)
app.include_router(verification_router.router)
app.include_router(dashboard_router.router)
app.include_router(workflow_agent_router.router)
app.include_router(memory_router.router)

@app.get("/")
def root():
    return {
        "system": settings.app_name,
        "version": settings.app_version,
        "status": "online",
        "message": "Cortex is running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
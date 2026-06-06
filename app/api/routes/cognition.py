from fastapi import APIRouter, Depends
from sqlmodel import Session
from pydantic import BaseModel
from app.core.database import get_session
from app.agents.cognition_engine import query_cognition, build_context

router = APIRouter(prefix="/cognition", tags=["Cognition Engine"])


class CognitionQuery(BaseModel):
    question: str


@router.post("/query")
async def cognition_query(request: CognitionQuery, session: Session = Depends(get_session)):
    return await query_cognition(request.question, session)


@router.get("/context")
def get_memory_context(session: Session = Depends(get_session)):
    context = build_context(session)
    lines = context.split("\n")
    return {
        "total_lines": len(lines),
        "context_preview": "\n".join(lines[:30]) + ("\n..." if len(lines) > 30 else ""),
        "full_context": context
    }
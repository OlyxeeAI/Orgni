import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from openai import AzureOpenAI
from sqlmodel import Session, select

from app.models.entities import Entity
from app.models.relationships import Relationship
from app.models.workflow_state import WorkflowState
from app.models.enterprise_decision import EnterpriseDecision
from app.memory.graph_engine import build_graph, find_path, get_neighbors
from app.core.config import settings

load_dotenv(dotenv_path=Path(".env"))
logger = logging.getLogger("cortex.cognition")


def get_azure_client() -> AzureOpenAI:
    return AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version
    )


def build_context(session: Session) -> str:
    entities = session.exec(select(Entity)).all()
    relationships = session.exec(select(Relationship)).all()
    states = session.exec(select(WorkflowState)).all()
    decisions = session.exec(select(EnterpriseDecision)).all()

    entity_map = {e.id: e.name for e in entities}

    context_parts = []

    context_parts.append("=== ENTITIES IN MEMORY ===")
    for e in entities:
        context_parts.append(f"- [{e.type.upper()}] {e.name}: {e.description or 'no description'}")

    context_parts.append("\n=== RELATIONSHIPS ===")
    for r in relationships:
        from_name = entity_map.get(r.from_entity_id, f"Entity#{r.from_entity_id}")
        to_name = entity_map.get(r.to_entity_id, f"Entity#{r.to_entity_id}")
        context_parts.append(f"- {from_name} --[{r.relationship_type}]--> {to_name}")

    if states:
        context_parts.append("\n=== WORKFLOW STATES ===")
        for s in states:
            context_parts.append(
                f"- {s.entity_name} | Step: {s.step_name} | State: {s.operational_state.upper()}"
                + (f" | Reason: {s.state_context}" if s.state_context else "")
            )

    if decisions:
        context_parts.append("\n=== ENTERPRISE DECISIONS ===")
        for d in decisions:
            context_parts.append(
                f"- [{d.decision_type.upper()}] {d.decision_text}"
                + (f" | By: {d.decided_by}" if d.decided_by else "")
                + (f" | Target: {d.decision_target}" if d.decision_target else "")
                + f" | Status: {d.status}"
            )

    return "\n".join(context_parts)


COGNITION_PROMPT = """You are Cortex, an Enterprise Cognition Infrastructure system.

You have access to a live organizational memory graph containing entities, relationships, workflow states, and enterprise decisions.

Your job is to answer questions about this organization with precision and clarity.

Rules:
- Only answer based on what is in the provided memory context
- If something is not in the context, say "Not found in Cortex memory"
- Be concise and direct — this is an enterprise system, not a chatbot
- When referencing entities, include their type (person, team, system, policy)
- For workflow questions, always include the current operational state
- For decision questions, always include who made the decision and the status

Memory Context:
{context}"""


async def query_cognition(question: str, session: Session) -> dict:
    context = build_context(session)

    if not context.strip():
        return {
            "question": question,
            "answer": "Cortex memory is empty. Ingest enterprise data first using POST /ingestion/ingest",
            "context_size": 0
        }

    client = get_azure_client()

    try:
        response = client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[
                {
                    "role": "system",
                    "content": COGNITION_PROMPT.format(context=context)
                },
                {
                    "role": "user",
                    "content": question
                }
            ],
            max_completion_tokens=1024
        )

        answer = response.choices[0].message.content
        tokens = response.usage.total_tokens

        return {
            "question": question,
            "answer": answer,
            "tokens_used": tokens,
            "model": f"Azure {settings.azure_openai_deployment}",
            "context_entities": context.count("[PERSON]") + context.count("[TEAM]") +
                                 context.count("[SYSTEM]") + context.count("[POLICY]") +
                                 context.count("[COMPANY]") + context.count("[DOCUMENT]"),
            "context_size": len(context)
        }

    except Exception as e:
        logger.exception(f"[CORTEX COGNITION] Error: {e}")
        return {
            "question": question,
            "answer": None,
            "error": str(e)
        }
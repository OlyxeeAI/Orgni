import json
import logging
from datetime import datetime
from openai import AzureOpenAI
from sqlmodel import Session, select

from app.models.ingestion import IngestionEvent
from app.models.entities import Entity
from app.models.relationships import Relationship
from app.models.workflow_state import WorkflowState
from app.models.enterprise_decision import EnterpriseDecision
from app.core.config import settings

logger = logging.getLogger("cortex.ingestion")

VALID_OPERATIONAL_STATES = {
    "pending", "active", "blocked", "complete",
    "approved", "failed", "under_review", "escalated"
}

VALID_DECISION_TYPES = {
    "approval", "compliance_sign_off", "rejection",
    "escalation", "policy_enforcement"
}

EXTRACTION_PROMPT = """You are Cortex, an enterprise knowledge extraction system.

From the enterprise text provided, extract all of the following:
1. ENTITIES — people, teams, systems, policies, documents, companies
2. RELATIONSHIPS — how entities connect (verb phrases)
3. WORKFLOW_STATES — any process steps or operational statuses mentioned
4. ENTERPRISE_DECISIONS — approvals, sign-offs, rejections, compliance confirmations

ENTITY TYPES: person | team | system | policy | document | company
OPERATIONAL STATES: pending | active | blocked | complete | approved | failed | under_review | escalated
DECISION TYPES: approval | compliance_sign_off | rejection | escalation | policy_enforcement

Return ONLY valid JSON — no markdown, no extra text:
{
  "entities": [
    {"name": "exact name", "type": "person|team|system|policy|document|company", "description": "one sentence"}
  ],
  "relationships": [
    {"from_name": "entity name", "to_name": "entity name", "relationship_type": "verb phrase"}
  ],
  "workflow_states": [
    {
      "entity_name": "entity this applies to",
      "step_name": "name of step or process",
      "step_number": 1,
      "operational_state": "pending|active|blocked|complete|approved|failed|under_review|escalated",
      "state_context": "brief reason or context"
    }
  ],
  "enterprise_decisions": [
    {
      "decision_type": "approval|compliance_sign_off|rejection|escalation|policy_enforcement",
      "decision_text": "exact decision as described in text",
      "decided_by": "person or role who made it",
      "decision_target": "what entity or process it applies to",
      "status": "confirmed|pending|overridden|revoked",
      "confidence": 0.95
    }
  ]
}"""


def get_azure_client() -> AzureOpenAI:
    return AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version
    )


class IngestionValidationError(Exception):
    def __init__(self, event_id: int, reason: str, raw: str = ""):
        self.event_id = event_id
        self.reason = reason
        self.raw = raw
        super().__init__(f"[CORTEX GUARDRAIL] Event {event_id} blocked — {reason}")


def validate_payload(raw_json: str, event_id: int) -> dict:
    required_keys = {"entities", "relationships", "workflow_states", "enterprise_decisions"}
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as e:
        raise IngestionValidationError(event_id, f"Non-parseable JSON from model: {e}", raw_json[:500])

    missing = required_keys - set(payload.keys())
    if missing:
        raise IngestionValidationError(event_id, f"Missing required keys: {missing}")

    for entity in payload.get("entities", []):
        if "name" not in entity or "type" not in entity:
            raise IngestionValidationError(event_id, f"Entity missing name or type: {entity}")

    for state in payload.get("workflow_states", []):
        op = state.get("operational_state", "").lower()
        if op and op not in VALID_OPERATIONAL_STATES:
            logger.warning(f"[Event {event_id}] Unknown state '{op}' — normalizing to 'active'")
            state["operational_state"] = "active"

    for decision in payload.get("enterprise_decisions", []):
        dt = decision.get("decision_type", "").lower()
        if dt and dt not in VALID_DECISION_TYPES:
            logger.warning(f"[Event {event_id}] Unknown decision_type '{dt}' — normalizing to 'approval'")
            decision["decision_type"] = "approval"

    return payload


async def process_ingestion_event(event_id: int, session: Session) -> dict:
    event = session.get(IngestionEvent, event_id)
    if not event:
        return {"error": f"Event {event_id} not found", "status": "error"}
    if event.status == "processed":
        return {"error": "Already processed", "status": "skipped"}

    event.status = "processing"
    session.add(event)
    session.commit()

    trace = {
        "event_id": event_id,
        "started_at": datetime.utcnow().isoformat(),
        "stages": []
    }

    try:
        # STAGE 1: Call Azure GPT-5
        client = get_azure_client()
        response = client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT},
                {"role": "user", "content": f"Extract from this enterprise text:\n\n{event.raw_content}"}
            ],
            max_completion_tokens=4096,
            response_format={"type": "json_object"}
        )
        raw_output = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        trace["stages"].append({"stage": "gpt5_extraction", "status": "ok", "tokens": tokens_used})

        # STAGE 2: Validate payload (APIARY Guardrail)
        try:
            payload = validate_payload(raw_output, event_id)
            trace["stages"].append({"stage": "validation", "status": "passed"})
        except IngestionValidationError as ve:
            logger.error(str(ve))
            event.status = "failed"
            session.add(event)
            session.commit()
            return {
                "status": "failed",
                "error": "CORTEX GUARDRAIL TRIGGERED",
                "reason": ve.reason,
                "trace": trace
            }

        # STAGE 3: Write Entities
        created_entities = {}
        entities_new = 0
        entities_existing = 0

        for e_data in payload.get("entities", []):
            existing = session.exec(
                select(Entity).where(Entity.name == e_data["name"])
            ).first()
            if existing:
                created_entities[e_data["name"]] = existing.id
                entities_existing += 1
            else:
                entity = Entity(
                    name=e_data["name"],
                    type=e_data.get("type", "unknown"),
                    description=e_data.get("description", "")
                )
                session.add(entity)
                session.commit()
                session.refresh(entity)
                created_entities[e_data["name"]] = entity.id
                entities_new += 1

        # STAGE 3b: Write Relationships
        mapped_relationships = []
        for r_data in payload.get("relationships", []):
            from_name = r_data.get("from_name")
            to_name = r_data.get("to_name")
            if from_name in created_entities and to_name in created_entities:
                rel = Relationship(
                    from_entity_id=created_entities[from_name],
                    to_entity_id=created_entities[to_name],
                    relationship_type=r_data["relationship_type"]
                )
                session.add(rel)
                session.commit()
                mapped_relationships.append({
                    "from": from_name,
                    "relationship": r_data["relationship_type"],
                    "to": to_name
                })

        trace["stages"].append({
            "stage": "entity_relationship_write",
            "status": "ok",
            "entities_new": entities_new,
            "entities_existing": entities_existing,
            "relationships": len(mapped_relationships)
        })

        # STAGE 4: Temporal State Tracking (APIARY Principle 1)
        states_written = []
        for s_data in payload.get("workflow_states", []):
            ws = WorkflowState(
                entity_name=s_data.get("entity_name", "unknown"),
                step_name=s_data.get("step_name", "unspecified"),
                step_number=s_data.get("step_number"),
                operational_state=s_data.get("operational_state", "active"),
                state_context=s_data.get("state_context"),
                extracted_from_event_id=event_id
            )
            session.add(ws)
            session.commit()
            states_written.append({
                "entity": ws.entity_name,
                "step": ws.step_name,
                "state": ws.operational_state
            })

        trace["stages"].append({
            "stage": "temporal_state_tracking",
            "status": "ok",
            "states_written": len(states_written)
        })

        # STAGE 5: Enterprise Decision Logs (APIARY Principle 3)
        decisions_logged = []
        for d_data in payload.get("enterprise_decisions", []):
            ed = EnterpriseDecision(
                decision_type=d_data.get("decision_type", "approval"),
                decision_text=d_data.get("decision_text", ""),
                decided_by=d_data.get("decided_by"),
                decision_target=d_data.get("decision_target"),
                status=d_data.get("status", "confirmed"),
                confidence=d_data.get("confidence"),
                extracted_from_event_id=event_id
            )
            session.add(ed)
            session.commit()
            decisions_logged.append({
                "type": ed.decision_type,
                "decided_by": ed.decided_by,
                "target": ed.decision_target,
                "status": ed.status
            })

        trace["stages"].append({
            "stage": "enterprise_decision_log",
            "status": "ok",
            "decisions_logged": len(decisions_logged)
        })

        # STAGE 6: Mark complete
        event.status = "processed"
        session.add(event)
        session.commit()
        trace["completed_at"] = datetime.utcnow().isoformat()

        return {
            "status": "processed",
            "event_id": event_id,
            "model": f"Azure {settings.azure_openai_deployment}",
            "tokens_used": tokens_used,
            "entities_new": entities_new,
            "entities_existing": entities_existing,
            "relationships_mapped": len(mapped_relationships),
            "workflow_states_tracked": len(states_written),
            "decisions_logged": len(decisions_logged),
            "relationships": mapped_relationships,
            "workflow_states": states_written,
            "decisions": decisions_logged,
            "operational_trace": trace
        }

    except Exception as e:
        logger.exception(f"[CORTEX] Unhandled error on event {event_id}: {e}")
        event.status = "failed"
        session.add(event)
        session.commit()
        return {
            "status": "failed",
            "error": str(e),
            "event_id": event_id,
            "operational_trace": trace
        }
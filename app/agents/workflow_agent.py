import logging
from datetime import datetime
from sqlmodel import Session, select

from app.models.workflows import Workflow
from app.models.agents import Agent, AgentTask
from app.models.workflow_state import WorkflowState
from app.models.verification import VerificationRule, VerificationResult
from app.core.config import settings

logger = logging.getLogger("cortex.workflow")

STEP_TRANSITION_RULES = {
    "pending":      "active",
    "active":       "complete",
    "blocked":      "active",
    "under_review": "approved",
    "approved":     "complete",
    "failed":       "pending",
    "escalated":    "under_review",
    "complete":     "complete"
}


def get_available_agent(session: Session, role: str) -> Agent | None:
    agent = session.exec(
        select(Agent).where(Agent.role == role, Agent.status == "active")
    ).first()
    return agent


def assign_task_to_agent(
    session: Session,
    agent: Agent,
    workflow: Workflow,
    task_type: str,
    description: str,
    priority: int = 5
) -> AgentTask:
    task = AgentTask(
        agent_id=agent.id,
        workflow_id=workflow.id,
        task_type=task_type,
        description=description,
        status="pending",
        priority=priority
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def check_verification_rules(session: Session, workflow: Workflow) -> dict:
    rules = session.exec(select(VerificationRule).where(
        VerificationRule.is_active == True
    )).all()

    passed = []
    failed = []
    warnings = []

    for rule in rules:
        result = VerificationResult(
            rule_id=rule.id,
            entity_id=workflow.entity_id,
            status="passed",
            checked_at=datetime.utcnow()
        )
        session.add(result)
        session.commit()

        if rule.severity == "critical":
            passed.append({"rule": rule.name, "severity": rule.severity})
        elif rule.severity == "warning":
            warnings.append({"rule": rule.name, "severity": rule.severity})
        else:
            passed.append({"rule": rule.name, "severity": rule.severity})

    return {
        "total_rules": len(rules),
        "passed": passed,
        "failed": failed,
        "warnings": warnings,
        "can_proceed": len(failed) == 0
    }


async def run_workflow(workflow_id: int, session: Session) -> dict:
    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        return {"error": f"Workflow {workflow_id} not found", "status": "error"}

    if workflow.status == "completed":
        return {"error": "Workflow already completed", "status": "skipped"}

    trace = {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "started_at": datetime.utcnow().isoformat(),
        "steps": []
    }

    # Step 1: Load current steps from workflow
    steps = workflow.steps if workflow.steps else []
    if not steps:
        return {
            "status": "error",
            "error": "Workflow has no steps defined",
            "workflow_id": workflow_id
        }

    # Step 2: Run verification rules before advancing
    verification = check_verification_rules(session, workflow)
    trace["verification"] = verification

    if not verification["can_proceed"]:
        workflow.status = "blocked"
        session.add(workflow)
        session.commit()
        return {
            "status": "blocked",
            "reason": "Verification rules failed — workflow cannot advance",
            "failed_rules": verification["failed"],
            "trace": trace
        }

    # Step 3: Find the current active or next pending step
    current_step = None
    next_step = None

    for step in steps:
        if isinstance(step, dict):
            if step.get("status") == "running":
                current_step = step
                break
            elif step.get("status") == "pending" and current_step is None:
                next_step = step

    target_step = current_step or next_step

    if not target_step:
        # All steps complete
        workflow.status = "completed"
        session.add(workflow)
        session.commit()
        trace["steps"].append({"action": "all_steps_complete", "status": "completed"})
        return {
            "status": "completed",
            "message": f"Workflow '{workflow.name}' fully completed",
            "workflow_id": workflow_id,
            "trace": trace
        }

    step_name = target_step.get("name", "Unknown Step")
    old_status = target_step.get("status", "pending")
    new_status = STEP_TRANSITION_RULES.get(old_status, "active")

    # Step 4: Update step status
    target_step["status"] = new_status
    target_step["updated_at"] = datetime.utcnow().isoformat()

    workflow.steps = steps
    if new_status == "complete":
        # Check if all steps are complete
        all_done = all(s.get("status") == "complete" for s in steps if isinstance(s, dict))
        workflow.status = "completed" if all_done else "running"
    else:
        workflow.status = "running"

    session.add(workflow)
    session.commit()

    trace["steps"].append({
        "step_name": step_name,
        "transition": f"{old_status} → {new_status}",
        "timestamp": datetime.utcnow().isoformat()
    })

    # Step 5: Write WorkflowState record
    ws = WorkflowState(
        entity_name=workflow.name,
        step_name=step_name,
        step_number=target_step.get("step"),
        operational_state=new_status,
        state_context=f"Auto-advanced by Workflow Agent at {datetime.utcnow().isoformat()}",
        workflow_id=workflow_id
    )
    session.add(ws)
    session.commit()

    # Step 6: Assign task to appropriate agent based on step
    tasks_created = []
    step_lower = step_name.lower()

    if any(word in step_lower for word in ["document", "collect", "ingest", "extract"]):
        agent = get_available_agent(session, "ingestion")
        role_label = "ingestion"
    elif any(word in step_lower for word in ["verify", "compliance", "check", "validation"]):
        agent = get_available_agent(session, "verification")
        role_label = "verification"
    else:
        agent = get_available_agent(session, "reasoning")
        role_label = "reasoning"

    if agent:
        task = assign_task_to_agent(
            session=session,
            agent=agent,
            workflow=workflow,
            task_type=f"workflow_step_{new_status}",
            description=f"Handle step '{step_name}' for workflow '{workflow.name}' — state: {new_status}",
            priority=7
        )
        tasks_created.append({
            "task_id": task.id,
            "assigned_to": agent.name,
            "agent_role": role_label,
            "task_type": task.task_type
        })
        trace["steps"].append({
            "action": "task_assigned",
            "agent": agent.name,
            "task_id": task.id
        })

    trace["completed_at"] = datetime.utcnow().isoformat()

    return {
        "status": "advanced",
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "workflow_status": workflow.status,
        "step_advanced": step_name,
        "transition": f"{old_status} → {new_status}",
        "tasks_created": tasks_created,
        "verification_summary": {
            "rules_checked": verification["total_rules"],
            "warnings": len(verification["warnings"])
        },
        "operational_trace": trace
    }


async def run_all_workflows(session: Session) -> dict:
    workflows = session.exec(
        select(Workflow).where(Workflow.status != "completed")
    ).all()

    if not workflows:
        return {"message": "No active workflows found", "processed": 0}

    results = []
    for workflow in workflows:
        result = await run_workflow(workflow.id, session)
        results.append(result)

    return {
        "processed": len(results),
        "results": results,
        "summary": {
            "advanced": len([r for r in results if r.get("status") == "advanced"]),
            "completed": len([r for r in results if r.get("status") == "completed"]),
            "blocked": len([r for r in results if r.get("status") == "blocked"]),
            "errors": len([r for r in results if r.get("status") == "error"])
        }
    }

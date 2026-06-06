import logging
from datetime import datetime
from sqlmodel import Session, select

from app.models.entities import Entity
from app.models.workflows import Workflow
from app.models.verification import VerificationRule, VerificationResult
from app.models.workflow_state import WorkflowState
from app.models.enterprise_decision import EnterpriseDecision

logger = logging.getLogger("cortex.verification")

SEVERITY_WEIGHTS = {
    "critical": 40,
    "warning": 15,
    "info": 5
}


def evaluate_rule(rule: VerificationRule, entity: Entity, session: Session) -> dict:
    condition = rule.condition.lower() if rule.condition else ""
    entity_type = entity.type.lower() if entity.type else ""
    entity_desc = (entity.description or "").lower()

    passed = True
    reason = "Rule condition satisfied"

    if "compliance_docs == submitted" in condition:
        if "compliance" not in entity_desc and "submitted" not in entity_desc:
            passed = False
            reason = f"Entity '{entity.name}' has no compliance documentation evidence"

    elif "vendor" in condition:
        if entity_type not in ["company", "team", "system"]:
            passed = True
            reason = "Rule does not apply to this entity type"

    elif "approval" in condition:
        decisions = session.exec(
            select(EnterpriseDecision).where(
                EnterpriseDecision.decision_target == entity.name,
                EnterpriseDecision.decision_type == "approval"
            )
        ).all()
        if not decisions:
            passed = False
            reason = f"No approval decision found for '{entity.name}'"
        else:
            passed = True
            reason = f"Approval found: {decisions[0].decided_by or 'unknown approver'}"

    elif "workflow" in condition or "approvals follow" in condition:
        states = session.exec(
            select(WorkflowState).where(
                WorkflowState.entity_name == entity.name
            )
        ).all()
        if not states:
            reason = "No workflow states tracked for this entity"
        else:
            passed = True
            reason = f"{len(states)} workflow state(s) tracked"

    return {
        "passed": passed,
        "reason": reason,
        "rule_name": rule.name,
        "severity": rule.severity
    }


def calculate_compliance_score(results: list) -> float:
    if not results:
        return 100.0

    total_weight = 0
    penalty = 0

    for r in results:
        weight = SEVERITY_WEIGHTS.get(r.get("severity", "info"), 5)
        total_weight += weight
        if not r.get("passed", True):
            penalty += weight

    if total_weight == 0:
        return 100.0

    score = max(0.0, 100.0 - (penalty / total_weight * 100))
    return round(score, 1)


async def run_verification_for_entity(entity_id: int, session: Session) -> dict:
    entity = session.get(Entity, entity_id)
    if not entity:
        return {"error": f"Entity {entity_id} not found", "status": "error"}

    rules = session.exec(
        select(VerificationRule).where(VerificationRule.is_active == True)
    ).all()

    if not rules:
        return {
            "entity_id": entity_id,
            "entity_name": entity.name,
            "status": "skipped",
            "reason": "No active verification rules found",
            "compliance_score": 100.0
        }

    results = []
    passed_count = 0
    failed_count = 0
    warning_count = 0

    for rule in rules:
        evaluation = evaluate_rule(rule, entity, session)

        vr = VerificationResult(
            rule_id=rule.id,
            entity_id=entity_id,
            status="passed" if evaluation["passed"] else "failed",
            details=evaluation["reason"],
            checked_at=datetime.utcnow()
        )
        session.add(vr)
        session.commit()

        result_entry = {
            "rule_id": rule.id,
            "rule_name": rule.name,
            "rule_type": rule.rule_type,
            "severity": rule.severity,
            "passed": evaluation["passed"],
            "reason": evaluation["reason"]
        }
        results.append(result_entry)

        if evaluation["passed"]:
            passed_count += 1
        else:
            if rule.severity == "critical":
                failed_count += 1
            else:
                warning_count += 1

    compliance_score = calculate_compliance_score(results)

    status = "compliant"
    if failed_count > 0:
        status = "non_compliant"
    elif warning_count > 0:
        status = "compliant_with_warnings"

    return {
        "entity_id": entity_id,
        "entity_name": entity.name,
        "entity_type": entity.type,
        "status": status,
        "compliance_score": compliance_score,
        "rules_checked": len(rules),
        "passed": passed_count,
        "failed": failed_count,
        "warnings": warning_count,
        "results": results,
        "checked_at": datetime.utcnow().isoformat()
    }


async def run_verification_for_workflow(workflow_id: int, session: Session) -> dict:
    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        return {"error": f"Workflow {workflow_id} not found"}

    rules = session.exec(
        select(VerificationRule).where(VerificationRule.is_active == True)
    ).all()

    results = []
    for rule in rules:
        condition = (rule.condition or "").lower()
        passed = True
        reason = "Rule satisfied for workflow"

        if "approval" in condition:
            steps = workflow.steps or []
            approved_steps = [
                s for s in steps
                if isinstance(s, dict) and s.get("status") in ["approved", "complete"]
            ]
            if not approved_steps:
                passed = False
                reason = "No approved steps found in workflow"
            else:
                reason = f"{len(approved_steps)} step(s) approved/complete"

        elif "sequence" in condition or "chain" in condition:
            steps = workflow.steps or []
            step_statuses = [s.get("status") for s in steps if isinstance(s, dict)]
            has_skipped = False
            seen_complete = False
            for status in step_statuses:
                if seen_complete and status == "pending":
                    has_skipped = True
                    break
                if status == "complete":
                    seen_complete = True
            passed = not has_skipped
            reason = "Approval chain intact" if passed else "Steps appear out of sequence"

        vr = VerificationResult(
            rule_id=rule.id,
            entity_id=workflow.entity_id,
            status="passed" if passed else "failed",
            details=f"[Workflow: {workflow.name}] {reason}",
            checked_at=datetime.utcnow()
        )
        session.add(vr)
        session.commit()

        results.append({
            "rule_name": rule.name,
            "severity": rule.severity,
            "passed": passed,
            "reason": reason
        })

    compliance_score = calculate_compliance_score(results)

    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "workflow_status": workflow.status,
        "compliance_score": compliance_score,
        "rules_checked": len(rules),
        "passed": len([r for r in results if r["passed"]]),
        "failed": len([r for r in results if not r["passed"]]),
        "results": results,
        "checked_at": datetime.utcnow().isoformat()
    }


async def run_all_verifications(session: Session) -> dict:
    entities = session.exec(select(Entity)).all()
    workflows = session.exec(select(Workflow)).all()

    entity_reports = []
    for entity in entities:
        report = await run_verification_for_entity(entity.id, session)
        entity_reports.append(report)

    workflow_reports = []
    for workflow in workflows:
        report = await run_verification_for_workflow(workflow.id, session)
        workflow_reports.append(report)

    all_scores = [r.get("compliance_score", 100) for r in entity_reports if "compliance_score" in r]
    overall_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 100.0

    non_compliant = [r for r in entity_reports if r.get("status") == "non_compliant"]
    with_warnings = [r for r in entity_reports if r.get("status") == "compliant_with_warnings"]
    compliant = [r for r in entity_reports if r.get("status") == "compliant"]

    return {
        "overall_compliance_score": overall_score,
        "total_entities_checked": len(entity_reports),
        "total_workflows_checked": len(workflow_reports),
        "summary": {
            "compliant": len(compliant),
            "compliant_with_warnings": len(with_warnings),
            "non_compliant": len(non_compliant)
        },
        "risk_level": (
            "HIGH" if len(non_compliant) > 0 else
            "MEDIUM" if len(with_warnings) > 0 else
            "LOW"
        ),
        "entity_reports": entity_reports,
        "workflow_reports": workflow_reports,
        "generated_at": datetime.utcnow().isoformat()
    }

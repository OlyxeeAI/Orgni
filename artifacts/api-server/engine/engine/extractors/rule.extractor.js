/**
 * src/engine/extractors/rule.extractor.js
 */

const ai = require('../../services/ai.service');

async function extract(corpus) {
  return ai.completeJSON(`You are Orgni Engine. Extract every business rule, approval policy, and exception condition.
Only include rules directly stated in the source. Quote the exact source phrase.
Return ONLY valid JSON:
{
  "rules": [
    {
      "rule_name": "",
      "condition": "",
      "action": "",
      "risk_level": "low|medium|high|critical",
      "department": "",
      "ai_allowed": true,
      "requires_human_approval": false,
      "_sourceDocName": "",
      "_sourceExcerpt": "",
      "_confidence": 0.0
    }
  ],
  "approvals": [
    {
      "approval_name": "",
      "trigger_condition": "",
      "approver_role": "",
      "escalation_path": "",
      "threshold": "",
      "_sourceDocName": "",
      "_sourceExcerpt": "",
      "_confidence": 0.0
    }
  ],
  "exceptions": [
    {
      "exception_name": "",
      "condition": "",
      "handling": "",
      "owner": "",
      "_sourceDocName": "",
      "_sourceExcerpt": "",
      "_confidence": 0.0
    }
  ],
  "ai_boundaries": []
}

BUSINESS INFORMATION:
${corpus}`);
}

module.exports = { extract };

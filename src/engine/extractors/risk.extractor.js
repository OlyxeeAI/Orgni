/**
 * src/engine/extractors/risk.extractor.js
 */

const ai = require('../../services/ai.service');

async function extract(corpus) {
  return ai.completeJSON(`You are Orgni Engine. Identify risks, bottlenecks, gaps, and dependencies.
Every finding must be specific to this business — no generic advice.
Return ONLY valid JSON:
{
  "risks": [
    {
      "risk": "",
      "severity": "low|medium|high|critical",
      "reason": "",
      "affected_workflow": "",
      "recommendation": "",
      "_confidence": 0.0
    }
  ],
  "bottlenecks": [
    {
      "bottleneck": "",
      "affected_workflow": "",
      "impact": "",
      "root_cause": "",
      "recommendation": "",
      "_confidence": 0.0
    }
  ],
  "gaps": [
    {
      "gap": "",
      "type": "process|documentation|approval|system|role",
      "affected_workflow": "",
      "recommendation": "",
      "_confidence": 0.0
    }
  ],
  "dependencies": [
    {
      "from": "",
      "to": "",
      "type": "role|system|document|workflow",
      "description": ""
    }
  ],
  "overall_risk_score": 0.0,
  "overall_risk_reason": ""
}

BUSINESS INFORMATION:
${corpus}`);
}

module.exports = { extract };

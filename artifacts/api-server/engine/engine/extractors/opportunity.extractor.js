/**
 * src/engine/extractors/opportunity.extractor.js
 */

const ai = require('../../services/ai.service');

async function extract(corpus) {
  return ai.completeJSON(`You are Orgni Engine. Identify specific AI opportunities and automation readiness for THIS business.
Every opportunity must reference a specific workflow or process from the source. Never give generic advice.
Return ONLY valid JSON:
{
  "opportunities": [
    {
      "opportunity": "",
      "workflow": "",
      "value": "",
      "risk_level": "low|medium|high",
      "required_data": [],
      "requires_human_approval": true,
      "suggested_first": false,
      "estimated_time_saving": "",
      "_confidence": 0.0
    }
  ],
  "readiness": [
    {
      "workflow": "",
      "readiness_score": 0,
      "reason": "",
      "blockers": [],
      "required_integrations": []
    }
  ],
  "blueprint": {
    "blueprints": [
      {
        "workflow_name": "",
        "trigger": "",
        "steps": [
          {
            "step": "",
            "actor": "AI|Human|AI+Human",
            "requires_approval": false,
            "risk_level": "low|medium|high"
          }
        ],
        "ai_boundaries": [],
        "human_approval_points": [],
        "integration_requirements": []
      }
    ]
  },
  "recommended_first_workflow": "",
  "reason": ""
}

BUSINESS INFORMATION:
${corpus}`);
}

module.exports = { extract };

/**
 * src/engine/extractors/workflow.extractor.js
 *
 * Extracts workflows from the corpus and validates each one.
 * Returns structured workflows with source references and confidence.
 */

const ai = require('../../services/ai.service');

async function extract(corpus) {
  const result = await ai.completeJSON(`You are Orgni Engine, the core intelligence system built by Olyxee.
Extract every operational workflow from the business information below.

For each workflow, you MUST:
- Only include it if it is directly supported by the source text
- Cite _sourceDocName: the document name from the SOURCE labels
- Include _sourceExcerpt: the exact phrase from the source that confirms this workflow exists
- Assign _confidence: 0.0-1.0 based on how explicitly the workflow is described
  (1.0 = fully described step by step, 0.5 = implied, 0.3 = guessed)

Return ONLY valid JSON — no markdown, no explanation:
{
  "workflows": [
    {
      "workflow_name": "",
      "trigger": "",
      "steps": [""],
      "owner": "",
      "required_documents": [],
      "decision_points": [],
      "approval_points": [],
      "dependencies": [],
      "exceptions": [],
      "risks": [],
      "bottlenecks": [],
      "ai_assistance_possible": [],
      "_sourceDocName": "",
      "_sourceExcerpt": "",
      "_confidence": 0.0,
      "_supported": true
    }
  ],
  "missing_information": []
}

BUSINESS INFORMATION:
${corpus}`);

  return result;
}

module.exports = { extract };

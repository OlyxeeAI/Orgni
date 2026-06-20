/**
 * src/engine/extractors/role.extractor.js
 */

const ai = require('../../services/ai.service');

async function extract(corpus) {
  return ai.completeJSON(`You are Orgni Engine. Extract every role, department, and responsibility.
Only include what is directly supported by the source. Cite sources.
Return ONLY valid JSON:
{
  "departments": [
    {
      "name": "",
      "functions": [],
      "_sourceDocName": "",
      "_confidence": 0.0
    }
  ],
  "roles": [
    {
      "role": "",
      "department": "",
      "tasks": [],
      "decision_authority": [],
      "approval_authority": [],
      "depends_on": [],
      "unclear_responsibilities": [],
      "_sourceDocName": "",
      "_sourceExcerpt": "",
      "_confidence": 0.0
    }
  ]
}

BUSINESS INFORMATION:
${corpus}`);
}

module.exports = { extract };

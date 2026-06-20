/**
 * src/services/analysis.service.js
 * Runs all Orgni extraction modules.
 * Every finding is linked back to the document it came from.
 */

const ai = require('./ai.service');
const insightModel = require('../models/insight.model');
const logger = require('../db/logger');

function buildCorpus(org, documents = []) {
  const profileSection = `[SOURCE: organization_profile]
Company: ${org.name}
Type: ${org.businessType}
Departments: ${(org.departments || []).join(', ') || 'not specified'}
Roles: ${(org.roles || []).map(r => r.role).join(', ') || 'not specified'}
Key Workflows: ${(org.keyWorkflows || []).join(', ') || 'not specified'}
Current Tools: ${(org.currentTools || []).join(', ') || 'not specified'}
Main Problems: ${(org.mainProblems || []).join(', ') || 'not specified'}
[END SOURCE: organization_profile]`;

  const docSections = documents
    .filter(d => d.status === 'parsed' && d.content)
    .map(d => `[SOURCE: ${d.id} | ${d.originalName}]\n${d.content}\n[END SOURCE: ${d.id}]`)
    .join('\n\n');

  return docSections ? `${profileSection}\n\n${docSections}` : profileSection;
}

async function extractAll(org, documents = []) {
  const corpus = buildCorpus(org, documents);
  logger.info('Starting full extraction', { orgId: org.id, corpusWords: corpus.split(/\s+/).length, docs: documents.length });

  const [bizMap, workflows, roles, approvals, risks, aiOpps, readiness, blueprint] = await Promise.all([
    extractBizMap(corpus, org.name),
    extractWorkflows(corpus),
    extractRoles(corpus),
    extractApprovals(corpus),
    extractRisks(corpus),
    extractAIOpps(corpus),
    extractReadiness(corpus),
    extractBlueprint(corpus)
  ]);

  return { bizMap, workflows, roles, approvals, risks, aiOpps, readiness, blueprint };
}

async function saveInsights(orgId, mapId, extraction, documents) {
  const jobs = [];

  for (const wf of extraction.workflows?.workflows || []) {
    jobs.push(insightModel.create({ orgId, mapId, type: 'workflow', content: wf,
      sourceDocumentName: wf._sourceDocName || 'organization_profile',
      confidence: extraction.bizMap?.confidence || 0.8 }));
  }
  for (const risk of extraction.risks?.risks || []) {
    jobs.push(insightModel.create({ orgId, mapId, type: 'risk', content: risk, confidence: 0.85 }));
  }
  for (const gap of extraction.risks?.gaps || []) {
    jobs.push(insightModel.create({ orgId, mapId, type: 'gap', content: gap, confidence: 0.85 }));
  }
  for (const rule of extraction.approvals?.rules || []) {
    jobs.push(insightModel.create({ orgId, mapId, type: 'rule', content: rule, confidence: 0.9 }));
  }
  for (const opp of extraction.aiOpps?.opportunities || []) {
    jobs.push(insightModel.create({ orgId, mapId, type: 'opportunity', content: opp, confidence: 0.8 }));
  }

  await Promise.all(jobs);
  logger.info('Insights saved', { orgId, mapId, count: jobs.length });
}

async function extractBizMap(corpus, bizName) {
  return ai.completeJSON(`You are Orgni, an organizational intelligence engine built by Olyxee.
Extract a structured business map. Return ONLY valid JSON — no markdown.
{"business_type":"","business_name":"${bizName}","summary":"2-3 sentence plain English summary","departments":[],"roles":[{"role":"","department":"","responsibilities":[]}],"systems":[],"documents":[],"recurring_decisions":[],"business_rules":[],"confidence":0.0,"confidence_reason":"","missing_information":[]}\nBUSINESS INFORMATION:\n${corpus}`);
}

async function extractWorkflows(corpus) {
  return ai.completeJSON(`You are Orgni. Detect every operational workflow. Note _sourceDocName where possible. Return ONLY valid JSON.
{"workflows":[{"workflow_name":"","trigger":"","steps":[],"owner":"","required_documents":[],"decision_points":[],"approval_points":[],"risks":[],"bottlenecks":[],"ai_assistance_possible":[],"_sourceDocName":""}],"missing_information":[]}\nBUSINESS INFORMATION:\n${corpus}`);
}

async function extractRoles(corpus) {
  return ai.completeJSON(`You are Orgni. Map every role and responsibility. Return ONLY valid JSON.
{"roles":[{"role":"","tasks":[],"decision_authority":[],"approval_authority":[],"depends_on":[],"unclear_responsibilities":[]}]}\nBUSINESS INFORMATION:\n${corpus}`);
}

async function extractApprovals(corpus) {
  return ai.completeJSON(`You are Orgni. Extract all governance rules and approval policies. Include the exact source phrase. Return ONLY valid JSON.
{"rules":[{"rule_name":"","condition":"","action":"","risk_level":"low|medium|high|critical","ai_allowed":true,"requires_human_approval":false,"source":""}],"ai_boundaries":[]}\nBUSINESS INFORMATION:\n${corpus}`);
}

async function extractRisks(corpus) {
  return ai.completeJSON(`You are Orgni. Identify all risks, bottlenecks, and process gaps specific to this business. Return ONLY valid JSON.
{"risks":[{"risk":"","severity":"low|medium|high|critical","reason":"","affected_workflow":"","recommendation":""}],"bottlenecks":[{"bottleneck":"","affected_workflow":"","impact":"","recommendation":""}],"gaps":[{"gap":"","type":"process|documentation|approval|system|role","recommendation":"","affected_workflow":""}],"overall_risk_score":0.0,"overall_risk_reason":""}\nBUSINESS INFORMATION:\n${corpus}`);
}

async function extractAIOpps(corpus) {
  return ai.completeJSON(`You are Orgni. Identify specific AI opportunities for THIS business only — never generic advice. Return ONLY valid JSON.
{"opportunities":[{"opportunity":"","workflow":"","value":"","risk_level":"low|medium|high","required_data":[],"requires_human_approval":true,"suggested_first":false,"estimated_time_saving":""}],"recommended_first_workflow":"","reason":""}\nBUSINESS INFORMATION:\n${corpus}`);
}

async function extractReadiness(corpus) {
  return ai.completeJSON(`You are Orgni. Score each workflow for AI automation readiness 0-100. Return ONLY valid JSON.
{"workflows":[{"workflow":"","readiness_score":0,"reason":"","blockers":[],"required_integrations":[]}],"highest_readiness_workflow":"","lowest_readiness_workflow":""}\nBUSINESS INFORMATION:\n${corpus}`);
}

async function extractBlueprint(corpus) {
  return ai.completeJSON(`You are Orgni. Generate governed AI blueprints per workflow. Return ONLY valid JSON.
{"blueprints":[{"workflow_name":"","trigger":"","steps":[{"step":"","actor":"AI|Human|AI+Human","requires_approval":false,"risk_level":"low|medium|high"}],"ai_boundaries":[],"human_approval_points":[],"integration_requirements":[]}]}\nBUSINESS INFORMATION:\n${corpus}`);
}

async function askQuestion(question, org, documents = []) {
  const corpus = buildCorpus(org, documents);
  const answer = await ai.complete(`You are Orgni for ${org.name} (built by Olyxee).
Answer using ONLY the business information provided. If supported, cite the source document. If not supported, say exactly: "I don't have enough information to answer that." and list what is needed. Never guess.

BUSINESS INFORMATION:
${corpus}

QUESTION: ${question}`);

  const grounded = !answer.toLowerCase().includes("i don't have enough information");
  const sources = documents
    .filter(d => answer.includes(d.originalName))
    .map(d => ({ documentId: d.id, documentName: d.originalName }));

  return { answer, grounded, sources };
}

async function generateAction(type, org, documents = [], context = '') {
  const corpus = buildCorpus(org, documents);
  const prompts = {
    task_list:        `Generate a prioritised task list of the 5-10 most important operational actions for ${org.name} right now. Be specific to their workflows and problems.`,
    draft_message:    `Draft a clear internal operational status update for ${org.name}'s team. Highlight what needs attention and next steps. ${context ? `Context: ${context}` : ''}`,
    workflow_summary: `Write a plain-English summary of how work flows through ${org.name}: main workflows, who does what, where things slow down.`,
    flag_missing:     `List all important information, documents, and processes that appear missing or undocumented at ${org.name}, with specific recommended actions.`,
    next_step:        `Identify the single most important operational next step for ${org.name} right now. Explain exactly why and how.`
  };
  return ai.complete(`You are Orgni for ${org.name} (built by Olyxee).
${prompts[type] || prompts.next_step}
Be completely specific to this business. No generic advice.

BUSINESS INFORMATION:
${corpus}`);
}

module.exports = { extractAll, saveInsights, askQuestion, generateAction, buildCorpus };

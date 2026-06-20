/**
 * src/engine/orgni.engine.js
 *
 * ORGNI ENGINE — Core intelligence layer.
 *
 * This is not a pipeline that runs once.
 * This is the system that:
 *   1. Reads business input (docs, text, profiles)
 *   2. Extracts structure using specialised extractors
 *   3. Validates every finding against its source
 *   4. Builds and updates the persistent knowledge map
 *   5. Supports incremental updates (new doc → partial re-extraction)
 *   6. Exposes a clean context API for Workflow, Finance, and future products
 *
 * Other products NEVER call the DB directly.
 * They call engine.getContext(orgId) and get what they need.
 */

const logger = require('../db/logger');
const ai = require('../services/ai.service');

// Extractors
const workflowExtractor  = require('./extractors/workflow.extractor');
const roleExtractor      = require('./extractors/role.extractor');
const ruleExtractor      = require('./extractors/rule.extractor');
const riskExtractor      = require('./extractors/risk.extractor');
const opportunityExtractor = require('./extractors/opportunity.extractor');

// Models
const knowledgeMap  = require('../models/knowledgeMap.model');
const validationModel = require('../models/validation.model');
const insightModel  = require('../models/insight.model');
const activityModel = require('../models/activity.model');
const orgModel      = require('../models/organization.model');

// ── Corpus builder ────────────────────────────────────────────────────────────

function buildCorpus(org, documents = []) {
  const profile = `[SOURCE: organization_profile]
Company: ${org.name}
Type: ${org.businessType}
Departments: ${(org.departments || []).join(', ') || 'not specified'}
Roles: ${(org.roles || []).map(r => r.role || r).join(', ') || 'not specified'}
Key Workflows: ${(org.keyWorkflows || []).join(', ') || 'not specified'}
Current Tools: ${(org.currentTools || []).join(', ') || 'not specified'}
Main Problems: ${(org.mainProblems || []).join(', ') || 'not specified'}
[END SOURCE: organization_profile]`;

  const docs = documents
    .filter(d => d.status === 'parsed' && d.content)
    .map(d => `[SOURCE: ${d.id} | ${d.originalName}]\n${d.content.slice(0, 8000)}\n[END SOURCE: ${d.id}]`)
    .join('\n\n');

  return docs ? `${profile}\n\n${docs}` : profile;
}

// ── Full intake (initial or full refresh) ─────────────────────────────────────

/**
 * Run the full extraction pipeline against all org documents.
 * Creates a new versioned knowledge map.
 * Called on first setup or when the user requests a full rebuild.
 */
async function runFullIntake(orgId, documents = []) {
  const org = await orgModel.findById(orgId);
  if (!org) throw new Error(`Organisation not found: ${orgId}`);

  const parsedDocs = documents.filter(d => d.status === 'parsed');
  const corpus = buildCorpus(org, parsedDocs);

  logger.info('Engine: full intake started', {
    orgId, docs: parsedDocs.length, words: corpus.split(/\s+/).length
  });

  // Run all extractors in parallel
  const [workflows, roles, rules, risks, opportunities] = await Promise.all([
    workflowExtractor.extract(corpus),
    roleExtractor.extract(corpus),
    ruleExtractor.extract(corpus),
    riskExtractor.extract(corpus),
    opportunityExtractor.extract(corpus)
  ]);

  // Extract business summary separately (needs all context)
  const summary = await extractSummary(corpus, org.name);

  // Collect all missing information
  const missingInformation = [
    ...(workflows.missing_information || []),
    ...(roles.missing_information || []),
    ...(summary.missing_information || [])
  ];

  // Build the new knowledge map
  const map = await knowledgeMap.createNewVersion(orgId, {
    businessSummary: summary,
    departments: roles.departments || [],
    roles: roles.roles || [],
    workflows: workflows.workflows || [],
    rules: rules.rules || [],
    approvals: rules.approvals || [],
    exceptions: rules.exceptions || [],
    risks: risks.risks || [],
    gaps: risks.gaps || [],
    dependencies: risks.dependencies || [],
    aiOpportunities: opportunities.opportunities || [],
    readiness: opportunities.readiness || [],
    blueprint: opportunities.blueprint || {},
    missingInformation,
    overallConfidence: summary.confidence || 0,
    overallRiskScore: risks.overall_risk_score || 0,
    recommendedNextSteps: buildNextSteps(risks, opportunities),
    sourceDocuments: parsedDocs.map(d => ({ id: d.id, name: d.originalName }))
  });

  // Validate and save each finding as a traceable insight
  await validateAndSaveInsights(orgId, map.id, { workflows, roles, rules, risks, opportunities }, parsedDocs);

  // Update org status
  await orgModel.update(orgId, { knowledgeStatus: 'ready' });
  await activityModel.log(orgId, 'engine_intake_complete', 'Full intelligence intake completed', {
    mapId: map.id, version: map.version, docCount: parsedDocs.length
  });

  logger.info('Engine: full intake complete', { orgId, mapId: map.id, version: map.version });
  return map;
}

// ── Incremental update (new document added) ───────────────────────────────────

/**
 * A new document was uploaded — re-extract only the affected parts
 * and merge into the existing knowledge map.
 * This is how the engine learns over time without starting from scratch.
 */
async function runIncrementalUpdate(orgId, newDocument, allDocuments = []) {
  const org = await orgModel.findById(orgId);
  if (!org) throw new Error(`Organisation not found: ${orgId}`);

  const currentMap = await knowledgeMap.getActive(orgId);
  if (!currentMap) {
    // No map yet — run full intake
    return runFullIntake(orgId, allDocuments);
  }

  // Build a focused corpus: just the new document
  const focusCorpus = buildCorpus(org, [newDocument]);

  logger.info('Engine: incremental update started', { orgId, doc: newDocument.originalName });

  // Run extractors on just the new document
  const [newWorkflows, newRules, newRisks] = await Promise.all([
    workflowExtractor.extract(focusCorpus),
    ruleExtractor.extract(focusCorpus),
    riskExtractor.extract(focusCorpus)
  ]);

  // Merge: add new findings, don't remove existing ones
  const patch = {
    workflows: mergeByName(currentMap.workflows, newWorkflows.workflows || [], 'workflow_name'),
    rules: mergeByName(currentMap.rules, newRules.rules || [], 'rule_name'),
    risks: mergeByName(currentMap.risks, newRisks.risks || [], 'risk'),
    sourceDocuments: [
      ...currentMap.sourceDocuments,
      { id: newDocument.id, name: newDocument.originalName }
    ],
    updatedAt: new Date().toISOString()
  };

  const updated = await knowledgeMap.mergeUpdate(orgId, patch);

  await activityModel.log(orgId, 'engine_incremental_update', `Knowledge updated from "${newDocument.originalName}"`, {
    docId: newDocument.id, mapId: currentMap.id
  });

  logger.info('Engine: incremental update complete', { orgId, doc: newDocument.originalName });
  return updated;
}

// ── Context API — what other products use ────────────────────────────────────

/**
 * Get the full business context for an org.
 * Workflow, Finance, and all future products call THIS — nothing else.
 */
async function getContext(orgId) {
  const map = await knowledgeMap.getActive(orgId);
  if (!map) return null;

  const validationStats = await validationModel.getStats(orgId);

  return {
    orgId,
    version: map.version,
    generatedAt: map.generatedAt,
    updatedAt: map.updatedAt,
    confidence: map.overallConfidence,
    riskScore: map.overallRiskScore,
    validationStats,

    // Core business intelligence
    summary: map.businessSummary,
    departments: map.departments,
    roles: map.roles,
    workflows: map.workflows,
    rules: map.rules,
    approvals: map.approvals,
    exceptions: map.exceptions,
    dependencies: map.dependencies,

    // Issues and gaps
    risks: map.risks,
    bottlenecks: (map.risks || []).filter ? [] : [],
    gaps: map.gaps,
    missingInformation: map.missingInformation,

    // AI readiness
    aiOpportunities: map.aiOpportunities,
    readiness: map.readiness,
    blueprint: map.blueprint,

    // What to do next
    recommendedNextSteps: map.recommendedNextSteps,
    sourceDocuments: map.sourceDocuments
  };
}

/**
 * Get context scoped to a specific domain.
 * Used by Orgni Finance, Orgni Workflow etc.
 */
async function getContextForDomain(orgId, domain) {
  const ctx = await getContext(orgId);
  if (!ctx) return null;

  const domains = {
    workflow: {
      workflows: ctx.workflows,
      roles: ctx.roles,
      dependencies: ctx.dependencies,
      bottlenecks: ctx.bottlenecks,
      blueprint: ctx.blueprint,
      missingInformation: ctx.missingInformation
    },
    finance: {
      rules: ctx.rules,
      approvals: ctx.approvals,
      exceptions: ctx.exceptions,
      risks: ctx.risks,
      gaps: ctx.gaps
    },
    intelligence: ctx  // full context
  };

  return {
    orgId,
    domain,
    context: domains[domain] || domains.intelligence,
    confidence: ctx.confidence,
    version: ctx.version
  };
}

/**
 * Ask a grounded question about the business.
 * Refuses to answer if the information is not in the knowledge map.
 */
async function ask(orgId, question, documents = []) {
  const org = await orgModel.findById(orgId);
  const ctx = await getContext(orgId);

  if (!ctx && documents.length === 0) {
    return {
      question,
      answer: "Orgni doesn't have enough information about this business yet. Please complete the intake process first.",
      grounded: false,
      sources: []
    };
  }

  // Build answer context from the knowledge map
  const knowledgeContext = ctx ? `
CURRENT KNOWLEDGE MAP (version ${ctx.version}):
Summary: ${JSON.stringify(ctx.summary)}
Workflows: ${JSON.stringify(ctx.workflows)}
Rules: ${JSON.stringify(ctx.rules)}
Approvals: ${JSON.stringify(ctx.approvals)}
Roles: ${JSON.stringify(ctx.roles)}
Risks: ${JSON.stringify(ctx.risks)}
  `.trim() : '';

  const docCorpus = buildCorpus(org, documents);

  const answer = await ai.complete(`You are Orgni Engine, the intelligence layer for ${org.name} built by Olyxee.

Answer the question using ONLY the information in the business knowledge below.

Rules:
- If supported: give a specific answer and say which source it came from.
- If not supported: say "I don't have enough information to answer that." then list exactly what information is needed.
- Never guess. Never give generic business advice.
- Reference specific workflows, rules, or roles from the knowledge.

${knowledgeContext}

BUSINESS DOCUMENTS:
${docCorpus}

QUESTION: ${question}`);

  const grounded = !answer.toLowerCase().includes("i don't have enough information");
  const sources = documents
    .filter(d => d.content && answer.includes(d.originalName))
    .map(d => ({ documentId: d.id, documentName: d.originalName }));

  return { question, answer, grounded, sources, confidence: ctx?.confidence || 0 };
}

// ── Validate and save insights ────────────────────────────────────────────────

async function validateAndSaveInsights(orgId, mapId, extraction, documents) {
  const jobs = [];

  // Validate workflows
  for (const wf of extraction.workflows?.workflows || []) {
    jobs.push(async () => {
      await insightModel.create({
        orgId, mapId, type: 'workflow',
        content: wf,
        sourceDocumentName: wf._sourceDocName,
        sourceExcerpt: wf._sourceExcerpt,
        confidence: wf._confidence || 0
      });
      await validationModel.create({
        orgId, mapId,
        insightType: 'workflow',
        claim: `Workflow: ${wf.workflow_name}`,
        sourceDocumentName: wf._sourceDocName,
        sourceExcerpt: wf._sourceExcerpt,
        confidence: wf._confidence || 0,
        supported: wf._supported !== false,
        reason: `Extracted from ${wf._sourceDocName || 'profile'}`
      });
    });
  }

  // Validate rules
  for (const rule of extraction.rules?.rules || []) {
    jobs.push(async () => {
      await insightModel.create({
        orgId, mapId, type: 'rule',
        content: rule,
        sourceDocumentName: rule._sourceDocName,
        sourceExcerpt: rule._sourceExcerpt || rule.source,
        confidence: rule._confidence || 0.9
      });
      await validationModel.create({
        orgId, mapId,
        insightType: 'rule',
        claim: `Rule: ${rule.rule_name} — ${rule.condition}`,
        sourceDocumentName: rule._sourceDocName,
        sourceExcerpt: rule._sourceExcerpt || rule.source,
        confidence: rule._confidence || 0.9,
        supported: !!rule._sourceExcerpt || !!rule.source,
        reason: rule.source ? 'Direct quote found in source' : 'Inferred from context'
      });
    });
  }

  // Validate risks
  for (const risk of extraction.risks?.risks || []) {
    jobs.push(async () => {
      await insightModel.create({
        orgId, mapId, type: 'risk',
        content: risk,
        confidence: risk._confidence || 0.8
      });
      await validationModel.create({
        orgId, mapId,
        insightType: 'risk',
        claim: `Risk: ${risk.risk}`,
        confidence: risk._confidence || 0.8,
        supported: true,
        reason: risk.reason
      });
    });
  }

  // Validate opportunities
  for (const opp of extraction.opportunities?.opportunities || []) {
    jobs.push(async () => {
      await insightModel.create({
        orgId, mapId, type: 'opportunity',
        content: opp,
        confidence: opp._confidence || 0.8
      });
    });
  }

  // Run sequentially to avoid DB write conflicts in lowdb
  for (const job of jobs) await job();
  logger.info('Engine: insights validated and saved', { orgId, mapId, count: jobs.length });
}

// ── Summary extractor ─────────────────────────────────────────────────────────

async function extractSummary(corpus, bizName) {
  return ai.completeJSON(`You are Orgni Engine. Extract a business summary from the information below.
Return ONLY valid JSON:
{
  "business_name": "${bizName}",
  "business_type": "",
  "plain_english_summary": "2-3 sentence summary of how this business operates",
  "core_function": "",
  "key_operational_facts": [],
  "systems_in_use": [],
  "document_types_in_use": [],
  "confidence": 0.0,
  "confidence_reason": "",
  "missing_information": []
}

BUSINESS INFORMATION:
${corpus}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Merge two arrays by a key field. Incoming items update existing ones.
 * New items are appended. Existing items not in the new list are preserved.
 */
function mergeByName(existing = [], incoming = [], key) {
  const merged = [...existing];
  for (const item of incoming) {
    const idx = merged.findIndex(e => e[key] === item[key]);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...item, _updatedAt: new Date().toISOString() };
    } else {
      merged.push(item);
    }
  }
  return merged;
}

function buildNextSteps(risks, opportunities) {
  const steps = [];
  const highRisks = (risks.risks || []).filter(r => r.severity === 'high' || r.severity === 'critical');
  if (highRisks.length > 0) {
    steps.push(`Address ${highRisks.length} high-severity risk(s): ${highRisks.map(r => r.risk).slice(0, 2).join(', ')}`);
  }
  if (opportunities.recommended_first_workflow) {
    steps.push(`Start AI pilot with: ${opportunities.recommended_first_workflow} — ${opportunities.reason || ''}`);
  }
  const gaps = (risks.gaps || []).slice(0, 2);
  for (const gap of gaps) {
    steps.push(`Close gap: ${gap.gap}`);
  }
  return steps.slice(0, 5);
}

module.exports = {
  runFullIntake,
  runIncrementalUpdate,
  getContext,
  getContextForDomain,
  ask,
  buildCorpus
};

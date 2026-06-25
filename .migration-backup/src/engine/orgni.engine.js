/**
 * src/engine/orgni.engine.js
 *
 * ORGNI ENGINE — Core intelligence layer.
 *
 * Responsibilities:
 *   1. Build a text corpus from org profile + uploaded documents
 *   2. Run specialised extractors in parallel
 *   3. Validate every finding against its source
 *   4. Create / version the persistent knowledge map
 *   5. Support incremental updates without full rebuilds
 *   6. Expose typed context APIs for Workflow, Finance, and future products
 */

const logger = require('../db/logger');
const ai     = require('../services/ai.service');
const { AIError } = require('../services/ai.service');

const workflowExtractor    = require('./extractors/workflow.extractor');
const roleExtractor        = require('./extractors/role.extractor');
const ruleExtractor        = require('./extractors/rule.extractor');
const riskExtractor        = require('./extractors/risk.extractor');
const opportunityExtractor = require('./extractors/opportunity.extractor');
const deterministicExtractor = require('./deterministic.extractor');

const knowledgeMap    = require('../models/knowledgeMap.model');
const validationModel = require('../models/validation.model');
const insightModel    = require('../models/insight.model');
const activityModel   = require('../models/activity.model');
const orgModel        = require('../models/organization.model');

// ── Corpus builder ─────────────────────────────────────────────────────────

function buildCorpus(org, documents = []) {
  const profile = [
    '[SOURCE: organization_profile]',
    `Company: ${org.name}`,
    `Type: ${org.businessType}`,
    `Departments: ${(org.departments || []).join(', ') || 'not specified'}`,
    `Roles: ${(org.roles || []).map(r => r.role || r).join(', ') || 'not specified'}`,
    `Key Workflows: ${(org.keyWorkflows || []).join(', ') || 'not specified'}`,
    `Current Tools: ${(org.currentTools || []).join(', ') || 'not specified'}`,
    `Main Problems: ${(org.mainProblems || []).join(', ') || 'not specified'}`,
    '[END SOURCE: organization_profile]'
  ].join('\n');

  const docs = documents
    .filter(d => d.status === 'parsed' && d.content)
    .map(d => `[SOURCE: ${d.id} | ${d.originalName}]\n${d.content.slice(0, 8000)}\n[END SOURCE: ${d.id}]`)
    .join('\n\n');

  return docs ? `${profile}\n\n${docs}` : profile;
}

// ── Full intake ────────────────────────────────────────────────────────────

async function runFullIntake(orgId, documents = []) {
  const org = await orgModel.findById(orgId);
  if (!org) throw new Error(`Organisation not found: ${orgId}`);

  const parsedDocs = documents.filter(d => d.status === 'parsed');
  const corpus     = buildCorpus(org, parsedDocs);

  logger.info('Engine: full intake started', {
    orgId, docs: parsedDocs.length, corpusWords: corpus.split(/\s+/).length
  });

  const { workflows, roles, rules, risks, opportunities, summary } = shouldUseLlmExtraction()
    ? await runLlmExtraction(corpus, org.name)
    : deterministicExtractor.extractKnowledge(org, parsedDocs);

  // Collect bottlenecks from all sources
  const bottlenecks = collectBottlenecks(risks, workflows);

  const missingInformation = [
    ...(workflows.missing_information || []),
    ...(roles.missing_information     || []),
    ...(summary.missing_information   || [])
  ];

  const map = await knowledgeMap.createNewVersion(orgId, {
    businessSummary:      summary,
    departments:          roles.departments          || [],
    roles:                roles.roles                || [],
    workflows:            workflows.workflows        || [],
    rules:                rules.rules                || [],
    approvals:            rules.approvals            || [],
    exceptions:           rules.exceptions           || [],
    risks:                risks.risks                || [],
    bottlenecks,
    gaps:                 risks.gaps                 || [],
    dependencies:         risks.dependencies         || [],
    aiOpportunities:      opportunities.opportunities|| [],
    readiness:            opportunities.readiness    || [],
    blueprint:            opportunities.blueprint    || {},
    missingInformation,
    overallConfidence:    summary.confidence         || 0,
    overallRiskScore:     risks.overall_risk_score   || 0,
    recommendedNextSteps: buildNextSteps(risks, opportunities),
    sourceDocuments:      parsedDocs.map(d => ({ id: d.id, name: d.originalName }))
  });

  await validateAndSaveInsights(orgId, map.id, { workflows, roles, rules, risks, opportunities });

  await orgModel.update(orgId, { knowledgeStatus: 'ready' });
  await activityModel.log(orgId, 'engine_intake_complete', 'Knowledge Map built', {
    mapId: map.id, version: map.version, docCount: parsedDocs.length
  });

  logger.info('Engine: full intake complete', { orgId, mapId: map.id, version: map.version });
  return map;
}

// ── Incremental update ─────────────────────────────────────────────────────

async function runIncrementalUpdate(orgId, newDocument, allDocuments = []) {
  const org        = await orgModel.findById(orgId);
  if (!org) throw new Error(`Organisation not found: ${orgId}`);

  const currentMap = await knowledgeMap.getActive(orgId);
  if (!currentMap) return runFullIntake(orgId, allDocuments);

  logger.info('Engine: incremental update started', { orgId, doc: newDocument.originalName });

  const extraction = shouldUseLlmExtraction()
    ? await runLlmExtraction(buildCorpus(org, [newDocument]), org.name)
    : deterministicExtractor.extractKnowledge(org, [newDocument]);
  const newWorkflows = extraction.workflows || {};
  const newRules = extraction.rules || {};
  const newRisks = extraction.risks || {};

  const patch = {
    workflows:       mergeByName(currentMap.workflows, newWorkflows.workflows || [], 'workflow_name'),
    rules:           mergeByName(currentMap.rules,     newRules.rules         || [], 'rule_name'),
    risks:           mergeByName(currentMap.risks,     newRisks.risks         || [], 'risk'),
    bottlenecks:     collectBottlenecks(newRisks, newWorkflows),
    sourceDocuments: [...(currentMap.sourceDocuments || []), { id: newDocument.id, name: newDocument.originalName }]
  };

  const updated = await knowledgeMap.mergeUpdate(orgId, patch);

  await activityModel.log(orgId, 'engine_incremental_update',
    `Knowledge updated from "${newDocument.originalName}"`,
    { docId: newDocument.id, mapId: currentMap.id }
  );

  logger.info('Engine: incremental update complete', { orgId, doc: newDocument.originalName });
  return updated;
}

// ── Context API ────────────────────────────────────────────────────────────

async function getContext(orgId) {
  const map = await knowledgeMap.getActive(orgId);
  if (!map) return null;

  const validationStats = await validationModel.getStats(orgId);

  return {
    orgId,
    version:         map.version,
    generatedAt:     map.generatedAt,
    updatedAt:       map.updatedAt,
    confidence:      map.overallConfidence,
    riskScore:       map.overallRiskScore,
    validationStats,

    summary:        map.businessSummary,
    departments:    map.departments,
    roles:          map.roles,
    workflows:      map.workflows,
    rules:          map.rules,
    approvals:      map.approvals,
    exceptions:     map.exceptions,
    dependencies:   map.dependencies,

    risks:               map.risks,
    bottlenecks:         map.bottlenecks || [],   // FIX: was always []
    gaps:                map.gaps,
    missingInformation:  map.missingInformation,

    aiOpportunities:     map.aiOpportunities,
    readiness:           map.readiness,
    blueprint:           map.blueprint,

    recommendedNextSteps: map.recommendedNextSteps,
    sourceDocuments:      map.sourceDocuments
  };
}

async function getContextForDomain(orgId, domain) {
  const ctx = await getContext(orgId);
  if (!ctx) return null;

  const domainContexts = {
    workflow: {
      workflows:          ctx.workflows,
      roles:              ctx.roles,
      dependencies:       ctx.dependencies,
      bottlenecks:        ctx.bottlenecks,
      blueprint:          ctx.blueprint,
      missingInformation: ctx.missingInformation
    },
    finance: {
      rules:      ctx.rules,
      approvals:  ctx.approvals,
      exceptions: ctx.exceptions,
      risks:      ctx.risks,
      gaps:       ctx.gaps
    }
  };

  if (!domainContexts[domain]) {
    throw new Error(`Unknown domain "${domain}". Valid domains: workflow, finance`);
  }

  return {
    orgId,
    domain,
    context:    domainContexts[domain],
    confidence: ctx.confidence,
    version:    ctx.version
  };
}

async function ask(orgId, question, documents = []) {
  const org = await orgModel.findById(orgId);
  if (!org) throw new Error(`Organisation not found: ${orgId}`);

  const ctx = await getContext(orgId);

  if (!ctx && documents.length === 0) {
    return {
      question,
      answer:   "Orgni doesn't have enough information about this business yet. Add source documents, then build the Knowledge Map.",
      grounded: false,
      sources:  []
    };
  }

  return deterministicExtractor.answerFromContext(question, ctx, documents);
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Run an extractor and return an empty fallback ONLY for recoverable failures
 * (e.g. malformed JSON from one extractor). Configuration errors like a missing
 * API key must propagate — silently returning {} would create a fake, empty
 * knowledge map and report success when nothing was actually extracted.
 */
async function safeExtract(name, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AIError && ['MISSING_API_KEY', 'AUTH_ERROR'].includes(err.code)) {
      throw err; // propagate — caller must not proceed with a fake empty map
    }
    logger.error(`Extractor "${name}" failed, using empty fallback`, { error: err.message });
    return {};
  }
}

function shouldUseLlmExtraction() {
  return process.env.ORGNI_USE_LLM_EXTRACTION === 'true';
}

async function runLlmExtraction(corpus, businessName) {
  const [workflows, roles, rules, risks, opportunities, summary] = await Promise.all([
    safeExtract('workflows',    () => workflowExtractor.extract(corpus)),
    safeExtract('roles',        () => roleExtractor.extract(corpus)),
    safeExtract('rules',        () => ruleExtractor.extract(corpus)),
    safeExtract('risks',        () => riskExtractor.extract(corpus)),
    safeExtract('opportunities',() => opportunityExtractor.extract(corpus)),
    safeExtract('summary',      () => extractSummary(corpus, businessName))
  ]);
  return { workflows, roles, rules, risks, opportunities, summary };
}

/**
 * Collect bottlenecks from multiple extraction outputs.
 * Bottlenecks may appear in risks.bottlenecks or workflow.bottlenecks fields.
 */
function collectBottlenecks(risks = {}, workflows = {}) {
  const fromRisks = (risks.bottlenecks || []);
  const fromWorkflows = (workflows.workflows || []).flatMap(wf =>
    (wf.bottlenecks || []).map(b => ({
      bottleneck:        typeof b === 'string' ? b : b.bottleneck,
      affected_workflow: wf.workflow_name,
      impact:            typeof b === 'object' ? b.impact : '',
      recommendation:    typeof b === 'object' ? b.recommendation : ''
    }))
  );
  return [...fromRisks, ...fromWorkflows];
}

async function extractSummary(corpus, bizName) {
  return ai.completeJSON(
    `You are Orgni Engine. Extract a business summary from the information below.\n` +
    `Return ONLY valid JSON:\n` +
    `{"business_name":"${bizName}","business_type":"","plain_english_summary":"2-3 sentence summary",` +
    `"core_function":"","key_operational_facts":[],"systems_in_use":[],"document_types_in_use":[],` +
    `"confidence":0.0,"confidence_reason":"","missing_information":[]}\n\n` +
    `BUSINESS INFORMATION:\n${corpus}`
  );
}

async function validateAndSaveInsights(orgId, mapId, extraction) {
  const jobs = [];

  for (const wf of extraction.workflows?.workflows || []) {
    jobs.push(async () => {
      await insightModel.create({ orgId, mapId, type: 'workflow', content: wf,
        sourceDocumentName: wf._sourceDocName, sourceExcerpt: wf._sourceExcerpt,
        confidence: wf._confidence || 0 });
      await validationModel.create({ orgId, mapId, insightType: 'workflow',
        claim: `Workflow: ${wf.workflow_name}`,
        sourceDocumentName: wf._sourceDocName, sourceExcerpt: wf._sourceExcerpt,
        confidence: wf._confidence || 0, supported: wf._supported !== false,
        reason: `Extracted from ${wf._sourceDocName || 'profile'}` });
    });
  }

  for (const rule of extraction.rules?.rules || []) {
    jobs.push(async () => {
      await insightModel.create({ orgId, mapId, type: 'rule', content: rule,
        sourceDocumentName: rule._sourceDocName, sourceExcerpt: rule._sourceExcerpt || rule.source,
        confidence: rule._confidence || 0.9 });
      await validationModel.create({ orgId, mapId, insightType: 'rule',
        claim: `Rule: ${rule.rule_name}`,
        sourceDocumentName: rule._sourceDocName, sourceExcerpt: rule._sourceExcerpt || rule.source,
        confidence: rule._confidence || 0.9,
        supported: !!(rule._sourceExcerpt || rule.source),
        reason: rule.source ? 'Direct quote in source' : 'Inferred from context' });
    });
  }

  for (const risk of extraction.risks?.risks || []) {
    jobs.push(async () => {
      await insightModel.create({ orgId, mapId, type: 'risk', content: risk,
        confidence: risk._confidence || 0.8 });
      await validationModel.create({ orgId, mapId, insightType: 'risk',
        claim: `Risk: ${risk.risk}`, confidence: risk._confidence || 0.8,
        supported: true, reason: risk.reason || '' });
    });
  }

  for (const opp of extraction.opportunities?.opportunities || []) {
    jobs.push(async () => {
      await insightModel.create({ orgId, mapId, type: 'opportunity', content: opp,
        confidence: opp._confidence || 0.8 });
    });
  }

  for (const job of jobs) await job(); // sequential to avoid lowdb write conflicts
  logger.info('Engine: insights saved', { orgId, mapId, count: jobs.length });
}

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

function buildNextSteps(risks = {}, opportunities = {}) {
  const steps = [];
  const highRisks = (risks.risks || []).filter(r => r.severity === 'high' || r.severity === 'critical');
  if (highRisks.length) {
    steps.push(`Address ${highRisks.length} high-severity risk(s): ${highRisks.map(r => r.risk).slice(0, 2).join(', ')}`);
  }
  if (opportunities.recommended_first_workflow) {
    steps.push(`Review workflow: ${opportunities.recommended_first_workflow} — ${opportunities.reason || ''}`);
  }
  for (const gap of (risks.gaps || []).slice(0, 2)) {
    steps.push(`Close gap: ${gap.gap}`);
  }
  return steps.slice(0, 5);
}

module.exports = { runFullIntake, runIncrementalUpdate, getContext, getContextForDomain, ask, buildCorpus };

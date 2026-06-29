/**
 * src/services/analysis.service.js
 *
 * Deterministic business actions generated from the Orgni Knowledge Map.
 * These helpers intentionally avoid LLM calls; they format existing profile,
 * document, and map context into useful operational outputs.
 */

async function generateAction(type, org, documents = [], context = '') {
  const parsedDocs = documents.filter(doc => doc.status === 'parsed');
  const map = await getMap(org.id);

  switch (type) {
    case 'task_list':
      return formatTaskList(org, parsedDocs, map);
    case 'draft_message':
      return formatDraftMessage(org, map, context);
    case 'workflow_summary':
      return formatWorkflowSummary(org, map);
    case 'flag_missing':
      return formatMissingInfo(org, parsedDocs, map);
    case 'next_step':
      return formatNextStep(org, parsedDocs, map);
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

async function getMap(orgId) {
  const OrgniEngine = require('../engine/orgni.engine');
  return OrgniEngine.getContext(orgId).catch(() => null);
}

function formatTaskList(org, docs, map) {
  const tasks = [];
  if (!docs.length) tasks.push('Add the first business source document.');
  if (!map) tasks.push('Build the Knowledge Map from uploaded source documents.');
  for (const gap of (map?.gaps || []).slice(0, 3)) tasks.push(gap.recommendation || `Close gap: ${gap.gap}`);
  for (const risk of (map?.risks || []).slice(0, 3)) tasks.push(risk.recommendation || `Review risk: ${risk.risk}`);
  for (const item of org.mainProblems || []) tasks.push(`Resolve profile issue: ${item}`);
  if (!tasks.length) tasks.push('Review the Knowledge Map and confirm the extracted workflows, rules, and approvals.');
  return numbered(unique(tasks).slice(0, 8));
}

function formatDraftMessage(org, map, context) {
  const lines = [
    `Team update for ${org.name}`,
    '',
    map
      ? `The current Knowledge Map covers ${(map.workflows || []).length} workflow(s), ${(map.rules || []).length} rule(s), and ${(map.risks || []).length} risk signal(s).`
      : 'The Knowledge Map has not been built yet.',
    context ? `Focus: ${context}` : '',
    formatNextStep(org, [], map)
  ].filter(Boolean);
  return lines.join('\n');
}

function formatWorkflowSummary(org, map) {
  const workflows = map?.workflows || [];
  if (!workflows.length) {
    return `${org.name} does not have documented workflows in the Knowledge Map yet. Add process documents, then build the map.`;
  }
  return workflows.slice(0, 6).map(workflow => {
    const steps = (workflow.steps || []).slice(0, 4).map(step => `- ${step}`).join('\n');
    return `${workflow.workflow_name}\nOwner: ${workflow.owner || 'Not specified'}\n${steps || '- Steps not specified'}`;
  }).join('\n\n');
}

function formatMissingInfo(org, docs, map) {
  const missing = [];
  if (!docs.length) missing.push('No parsed source documents are available.');
  if (!(org.departments || []).length) missing.push('Departments are not listed in the business profile.');
  if (!(org.currentTools || []).length) missing.push('Current tools/systems are not listed in the business profile.');
  for (const item of map?.missingInformation || []) missing.push(item);
  for (const gap of map?.gaps || []) missing.push(gap.gap);
  return unique(missing).length
    ? unique(missing).map(item => `- ${item}`).join('\n')
    : 'No obvious missing information was found in the current Knowledge Map.';
}

function formatNextStep(org, docs, map) {
  const first = map?.recommendedNextSteps?.[0];
  if (first) return `Next step: ${first}`;
  if (!docs.length) return 'Next step: Add source documents for this business.';
  if (!map) return 'Next step: Build the Knowledge Map.';
  const workflow = map.workflows?.[0]?.workflow_name;
  if (workflow) return `Next step: Review and confirm the "${workflow}" workflow.`;
  return `Next step: Review ${org.name}'s business profile and add clearer workflow documents.`;
}

function numbered(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

module.exports = { generateAction };

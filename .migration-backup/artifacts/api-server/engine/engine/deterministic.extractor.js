/**
 * Deterministic knowledge extraction.
 *
 * This is the default Orgni intake path. It deliberately avoids LLM calls and
 * uses predictable parsing rules, source snippets, and conservative confidence
 * scores. LLM extraction can still be added later as an optional enhancer, but
 * the core product should be useful without it.
 */

function extractKnowledge(org, documents = []) {
  const sources = buildSources(org, documents);
  const departments = extractDepartments(org, sources);
  const roles = extractRoles(org, sources, departments);
  const workflows = extractWorkflows(org, sources);
  const rulesBundle = extractRules(sources);
  const risksBundle = extractRisks(sources, workflows);
  const missingInformation = buildMissingInformation(org, workflows, rulesBundle, sources);
  const summary = buildSummary(org, sources, workflows, rulesBundle, risksBundle);

  return {
    summary,
    workflows: { workflows, missing_information: missingInformation },
    roles: { departments, roles, missing_information: [] },
    rules: rulesBundle,
    risks: risksBundle,
    opportunities: buildOpportunities(workflows, rulesBundle, risksBundle)
  };
}

function buildSources(org, documents) {
  const profileLines = [
    `Business: ${org.name}`,
    `Type: ${org.businessType || ''}`,
    `Departments: ${(org.departments || []).join(', ')}`,
    `Key workflows: ${(org.keyWorkflows || []).join(', ')}`,
    `Current tools: ${(org.currentTools || []).join(', ')}`,
    `Main problems: ${(org.mainProblems || []).join(', ')}`
  ];

  return [
    {
      id: 'organization_profile',
      name: 'Business profile',
      text: profileLines.join('\n')
    },
    ...documents
      .filter(doc => doc.status === 'parsed' && doc.content)
      .map(doc => ({ id: doc.id, name: doc.originalName, text: doc.content }))
  ];
}

function extractDepartments(org, sources) {
  const names = new Set((org.departments || []).filter(Boolean));
  const common = ['Finance', 'Operations', 'Sales', 'Support', 'Customer Service', 'HR', 'Marketing', 'Procurement', 'Logistics'];
  for (const source of sources) {
    for (const name of common) {
      if (new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(source.text)) names.add(name);
    }
  }
  return [...names].map(name => ({ name, functions: inferDepartmentFunctions(name) }));
}

function inferDepartmentFunctions(name) {
  const map = {
    Finance: ['Approvals', 'Payments', 'Invoice processing'],
    Operations: ['Delivery records', 'Process execution'],
    Sales: ['Customer acquisition', 'Pipeline management'],
    Support: ['Customer requests', 'Issue resolution'],
    'Customer Service': ['Customer requests', 'Issue resolution'],
    HR: ['People operations'],
    Marketing: ['Campaigns'],
    Procurement: ['Supplier management'],
    Logistics: ['Delivery operations']
  };
  return map[name] || [];
}

function extractRoles(org, sources, departments) {
  const roleNames = new Set((org.roles || []).map(role => role.role || role).filter(Boolean));
  const rolePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+(?:Assistant|Manager|Director|Lead|Officer|Clerk|Coordinator|Supervisor|Team))\b/g;

  for (const source of sources) {
    for (const match of source.text.matchAll(rolePattern)) {
      roleNames.add(match[1].trim());
    }
  }

  return [...roleNames].map(role => ({
    role,
    department: inferRoleDepartment(role, departments),
    tasks: findRoleTasks(role, sources),
    decision_authority: findAuthority(role, sources),
    approval_authority: findAuthority(role, sources),
    depends_on: [],
    unclear_responsibilities: [],
    _sourceDocName: findSourceForTerm(role, sources)?.name || 'Business profile',
    _sourceExcerpt: findExcerpt(findSourceForTerm(role, sources)?.text || '', role),
    _confidence: 0.72
  }));
}

function inferRoleDepartment(role, departments) {
  const found = departments.find(dep => role.toLowerCase().includes(dep.name.toLowerCase()));
  return found?.name || '';
}

function findRoleTasks(role, sources) {
  const tasks = [];
  const roleRegex = new RegExp(`${escapeRegExp(role)}[^.\\n]*`, 'ig');
  for (const source of sources) {
    for (const match of source.text.matchAll(roleRegex)) {
      const line = match[0].trim();
      if (line.length > role.length) tasks.push(line);
    }
  }
  return unique(tasks).slice(0, 5);
}

function findAuthority(role, sources) {
  return findRoleTasks(role, sources).filter(task => /approv|sign-?off|review|authori/i.test(task));
}

function extractWorkflows(org, sources) {
  const workflows = [];
  const profileWorkflows = org.keyWorkflows || [];
  for (const workflow of profileWorkflows) {
    workflows.push(buildWorkflow(workflow, sources[0], org));
  }

  for (const source of sources) {
    const headings = source.text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length >= 4 && line.length <= 90 && /(process|workflow|procedure|sop|approval|intake|onboarding|fulfilment|fulfillment)/i.test(line));

    for (const heading of headings) {
      workflows.push(buildWorkflow(cleanWorkflowName(heading), source, org));
    }
  }

  if (!workflows.length) {
    const candidate = sources.find(source => /(receive|check|approve|review|send|route|flag|hold|resolve)/i.test(source.text));
    if (candidate) workflows.push(buildWorkflow('Documented operating process', candidate, org));
  }

  return uniqueBy(workflows, workflow => workflow.workflow_name.toLowerCase()).slice(0, 12);
}

function buildWorkflow(name, source, org) {
  const sentences = splitSentences(source.text);
  const processSentences = sentences.filter(sentence => /(receive|check|approve|review|send|route|flag|hold|resolve|maintain|match|sign-?off)/i.test(sentence));
  const steps = processSentences.map(sentence => sentence.trim()).slice(0, 8);
  const approval_points = processSentences.filter(sentence => /approv|sign-?off/i.test(sentence));
  const decision_points = processSentences.filter(sentence => /if |when |cannot|over|under|match|flag/i.test(sentence));

  return {
    workflow_name: name,
    trigger: findFirst(processSentences, /(receive|request|invoice|email|submitted|created)/i),
    steps,
    owner: inferOwner(source.text, org),
    required_documents: extractDocumentTypes(source.text),
    decision_points,
    approval_points,
    dependencies: extractDependencies(source.text),
    exceptions: processSentences.filter(sentence => /cannot|exception|discrepanc|failed|missing/i.test(sentence)),
    risks: [],
    bottlenecks: [],
    ai_assistance_possible: [],
    _sourceDocName: source.name,
    _sourceExcerpt: steps[0] || source.text.slice(0, 180),
    _confidence: steps.length >= 2 ? 0.76 : 0.58,
    _supported: true
  };
}

function extractRules(sources) {
  const rules = [];
  const approvals = [];
  const exceptions = [];
  const amountRulePattern = /(payments?|invoices?|orders?|amounts?)[^.\\n]*(?:over|above|greater than|more than)\s+R?\$?([\d,]+)[^.\\n]*(?:require|needs?|must|should)[^.\\n]*(approval|sign-?off|review)[^.\\n]*/ig;

  for (const source of sources) {
    for (const sentence of splitSentences(source.text)) {
      const lower = sentence.toLowerCase();
      const amountMatch = [...sentence.matchAll(amountRulePattern)][0];
      if (amountMatch) {
        const rule = {
          rule_name: `${titleCase(amountMatch[1])} over ${amountMatch[2]} require ${amountMatch[3]}`,
          condition: `amount > ${amountMatch[2].replace(/,/g, '')}`,
          action: sentence.trim(),
          risk_level: /director|high|critical/i.test(sentence) ? 'high' : 'medium',
          department: inferDepartment(sentence),
          ai_allowed: false,
          requires_human_approval: true,
          _sourceDocName: source.name,
          _sourceExcerpt: sentence.trim(),
          _confidence: 0.88,
          source: sentence.trim()
        };
        rules.push(rule);
        approvals.push({
          approval: sentence.trim(),
          approver: extractApprover(sentence),
          condition: rule.condition,
          _sourceDocName: source.name,
          _sourceExcerpt: sentence.trim(),
          _confidence: 0.86
        });
      } else if (/(must|required|requires|should|cannot|never|always)/i.test(sentence) && sentence.length < 240) {
        rules.push({
          rule_name: sentence.replace(/[.。]$/, '').slice(0, 90),
          condition: /if|when|over|above|cannot/i.test(sentence) ? sentence.trim() : '',
          action: sentence.trim(),
          risk_level: /cannot|must|approval|sign-?off/i.test(sentence) ? 'medium' : 'low',
          department: inferDepartment(sentence),
          ai_allowed: !/approval|sign-?off|payment/i.test(sentence),
          requires_human_approval: /approval|sign-?off/i.test(sentence),
          _sourceDocName: source.name,
          _sourceExcerpt: sentence.trim(),
          _confidence: 0.72,
          source: sentence.trim()
        });
      }

      if (/if |cannot|exception|discrepanc|held|flag/i.test(lower)) {
        exceptions.push({
          exception: sentence.trim(),
          _sourceDocName: source.name,
          _sourceExcerpt: sentence.trim(),
          _confidence: 0.7
        });
      }
    }
  }

  return {
    rules: uniqueBy(rules, rule => rule.rule_name.toLowerCase()).slice(0, 30),
    approvals: uniqueBy(approvals, item => item.approval.toLowerCase()).slice(0, 20),
    exceptions: uniqueBy(exceptions, item => item.exception.toLowerCase()).slice(0, 20),
    ai_boundaries: rules.filter(rule => rule.requires_human_approval).map(rule => `Human approval required: ${rule.action}`)
  };
}

function extractRisks(sources, workflows) {
  const risks = [];
  const gaps = [];
  const dependencies = [];

  for (const source of sources) {
    for (const sentence of splitSentences(source.text)) {
      if (/(manual|cannot|missing|discrepanc|risk|delay|held|flag|unclear|bottleneck|problem)/i.test(sentence)) {
        risks.push({
          risk: normalizeRisk(sentence),
          severity: /(cannot|missing|discrepanc|held|manual)/i.test(sentence) ? 'medium' : 'low',
          reason: sentence.trim(),
          affected_workflow: workflows[0]?.workflow_name || '',
          recommendation: buildRiskRecommendation(sentence),
          _sourceDocName: source.name,
          _sourceExcerpt: sentence.trim(),
          _confidence: 0.68
        });
      }

      if (/(not specified|missing|unclear|cannot be matched|no documented|unknown)/i.test(sentence)) {
        gaps.push({
          gap: sentence.trim(),
          type: 'process',
          affected_workflow: workflows[0]?.workflow_name || '',
          recommendation: 'Document the owner, rule, and resolution path.'
        });
      }

      if (/(depends on|requires|against the|based on|until)/i.test(sentence)) {
        dependencies.push({
          dependency: sentence.trim(),
          _sourceDocName: source.name,
          _sourceExcerpt: sentence.trim(),
          _confidence: 0.62
        });
      }
    }
  }

  const uniqueRisks = uniqueBy(risks, risk => risk.risk.toLowerCase()).slice(0, 20);
  return {
    risks: uniqueRisks,
    bottlenecks: [],
    gaps: uniqueBy(gaps, gap => gap.gap.toLowerCase()).slice(0, 20),
    dependencies: uniqueBy(dependencies, dep => dep.dependency.toLowerCase()).slice(0, 20),
    overall_risk_score: uniqueRisks.length ? Math.min(0.85, 0.2 + uniqueRisks.length * 0.08) : 0.15,
    overall_risk_reason: uniqueRisks.length
      ? 'Risk score is based on explicit risk, manual-process, exception, and missing-information signals in source text.'
      : 'Few explicit risk signals were found in the source text.'
  };
}

function buildOpportunities(workflows, rulesBundle, risksBundle) {
  const firstWorkflow = workflows[0]?.workflow_name || '';
  return {
    opportunities: [],
    readiness: firstWorkflow ? [{
      workflow: firstWorkflow,
      readiness_score: rulesBundle.rules.length ? 55 : 35,
      reason: 'Readiness is based on documented steps and rules, not AI interpretation.',
      blockers: risksBundle.gaps.map(gap => gap.gap).slice(0, 3),
      required_integrations: []
    }] : [],
    blueprint: { blueprints: [] },
    recommended_first_workflow: firstWorkflow,
    reason: firstWorkflow ? 'Most clearly documented workflow.' : ''
  };
}

function buildMissingInformation(org, workflows, rulesBundle, sources) {
  const missing = [];
  if (!(org.departments || []).length) missing.push('Business departments are not listed in the profile.');
  if (!(org.currentTools || []).length && !/(system|software|tool|email|spreadsheet|xero|quickbooks|hubspot|salesforce)/i.test(joinSources(sources))) {
    missing.push('Current systems/tools are not documented.');
  }
  if (!workflows.length) missing.push('No clear workflow names or process headings were found.');
  if (!rulesBundle.approvals.length) missing.push('Approval rules are not clearly documented.');
  return unique(missing);
}

function buildSummary(org, sources, workflows, rulesBundle, risksBundle) {
  const docNames = sources.filter(s => s.id !== 'organization_profile').map(s => s.name);
  return {
    business_name: org.name,
    business_type: org.businessType || '',
    plain_english_summary: `${org.name} is a ${org.businessType || 'business'} with ${workflows.length} documented workflow${workflows.length === 1 ? '' : 's'} and ${rulesBundle.rules.length} extracted rule${rulesBundle.rules.length === 1 ? '' : 's'}. The map was built deterministically from profile data and parsed source documents.`,
    core_function: org.businessType || '',
    key_operational_facts: [
      ...workflows.map(w => `Workflow: ${w.workflow_name}`),
      ...rulesBundle.rules.slice(0, 3).map(r => `Rule: ${r.rule_name}`)
    ],
    systems_in_use: org.currentTools || [],
    document_types_in_use: unique(docNames.map(name => name.split('.').pop()?.toLowerCase()).filter(Boolean)),
    confidence: calculateConfidence(workflows, rulesBundle, risksBundle),
    confidence_reason: 'Confidence is rule-based: higher when source text contains explicit workflow steps, approval rules, and source excerpts.',
    missing_information: []
  };
}

function calculateConfidence(workflows, rulesBundle) {
  let score = 0.35;
  if (workflows.length) score += 0.2;
  if (workflows.some(w => w.steps.length >= 2)) score += 0.15;
  if (rulesBundle.rules.length) score += 0.15;
  if (rulesBundle.approvals.length) score += 0.1;
  return Math.min(0.88, Math.round(score * 100) / 100);
}

function answerFromContext(question, ctx, documents = []) {
  const terms = tokenize(question);
  const candidates = [
    ...toCandidates(ctx?.workflows, ['workflow_name', 'trigger', 'owner', 'steps', 'approval_points']),
    ...toCandidates(ctx?.rules, ['rule_name', 'condition', 'action', 'source']),
    ...toCandidates(ctx?.roles, ['role', 'department', 'tasks', 'approval_authority']),
    ...toCandidates(ctx?.risks, ['risk', 'reason', 'recommendation']),
    ...toCandidates(ctx?.gaps, ['gap', 'recommendation']),
    ...documents.filter(d => d.content).map(d => ({
      label: d.originalName,
      text: d.content,
      source: d.originalName
    }))
  ];

  const ranked = candidates
    .map(item => ({ ...item, score: scoreText(item.text, terms) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (!ranked.length) {
    return {
      question,
      answer: "No matching business context was found. Add or update source documents, then rebuild the Knowledge Map.",
      grounded: false,
      sources: [],
      confidence: ctx?.confidence || 0
    };
  }

  return {
    question,
    answer: ranked.map(item => `${item.label}: ${trimText(item.text, 320)}`).join('\n\n'),
    grounded: true,
    sources: uniqueBy(ranked.map(item => ({ documentName: item.source })).filter(s => s.documentName), s => s.documentName),
    confidence: ctx?.confidence || 0
  };
}

function toCandidates(items = [], fields = []) {
  return (items || []).map(item => {
    const text = fields.map(field => stringify(item[field])).filter(Boolean).join(' ');
    return {
      label: item.workflow_name || item.rule_name || item.role || item.risk || item.gap || 'Context',
      text,
      source: item._sourceDocName || item.sourceDocumentName || ''
    };
  });
}

function scoreText(text, terms) {
  const lower = String(text || '').toLowerCase();
  return terms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
}

function tokenize(text) {
  const stop = new Set(['what', 'which', 'where', 'when', 'who', 'does', 'the', 'and', 'for', 'this', 'that', 'with', 'from', 'about', 'into', 'above']);
  return String(text || '').toLowerCase().match(/[a-z0-9,]+/g)?.filter(token => token.length > 2 && !stop.has(token)) || [];
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 8);
}

function cleanWorkflowName(text) {
  return text.replace(/[—–-].*$/, '').replace(/\bSOP\b/ig, '').replace(/\s+/g, ' ').trim();
}

function inferOwner(text, org) {
  const role = [...String(text).matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s+(?:Assistant|Manager|Director|Team|Lead|Officer|Coordinator))\b/g)][0]?.[1];
  return role || (org.departments || [])[0] || '';
}

function extractDocumentTypes(text) {
  const types = ['invoice', 'delivery record', 'email', 'purchase order', 'contract', 'quote', 'receipt', 'statement'];
  return types.filter(type => new RegExp(`\\b${escapeRegExp(type)}s?\\b`, 'i').test(text)).map(titleCase);
}

function extractDependencies(text) {
  return splitSentences(text).filter(sentence => /(against the|based on|requires|until|depends on)/i.test(sentence)).slice(0, 8);
}

function inferDepartment(text) {
  const match = String(text).match(/\b(Finance|Operations|Sales|Support|HR|Marketing|Procurement|Logistics)\b/i);
  return match ? titleCase(match[1]) : '';
}

function extractApprover(text) {
  const match = String(text).match(/\b(Finance Manager|Director|Manager|Supervisor|Lead|Owner)\b/i);
  return match ? titleCase(match[1]) : '';
}

function findFirst(items, pattern) {
  return items.find(item => pattern.test(item)) || '';
}

function findSourceForTerm(term, sources) {
  return sources.find(source => new RegExp(escapeRegExp(term), 'i').test(source.text));
}

function findExcerpt(text, term) {
  const index = String(text).toLowerCase().indexOf(String(term).toLowerCase());
  if (index < 0) return '';
  return trimText(text.slice(Math.max(0, index - 80), index + term.length + 120), 220);
}

function normalizeRisk(sentence) {
  return sentence.replace(/^if\s+/i, '').replace(/[.。]$/, '').trim();
}

function buildRiskRecommendation(sentence) {
  if (/manual/i.test(sentence)) return 'Standardise or automate this check where possible.';
  if (/missing|cannot|discrepanc/i.test(sentence)) return 'Document the exception path and responsible owner.';
  return 'Review and document the control for this risk.';
}

function joinSources(sources) {
  return sources.map(source => source.text).join('\n');
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stringify(value) {
  if (Array.isArray(value)) return value.map(stringify).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(stringify).join(' ');
  return value == null ? '' : String(value);
}

function trimText(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function titleCase(text) {
  return String(text || '').replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { extractKnowledge, answerFromContext };

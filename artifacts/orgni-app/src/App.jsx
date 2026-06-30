import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Brain,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Database,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Globe,
  Layers3,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map,
  Maximize2,
  Minus,
  Pencil,
  Plus,
  Plug,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  Workflow,
  X
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localApi } from './localApi.js';
import orgniLogo from './assets/orgni-logo.png';
import orgniWorkflowLogo from './assets/orgni-workflow.png';
import orgniFinanceLogo from './assets/orgni-finance.png';
import logoOpenai from './assets/logos/openai.svg';
import logoCopilot from './assets/logos/microsoft-copilot.svg';
import logoSlack from './assets/logos/slack.svg';
import logoTeams from './assets/logos/microsoft-teams.svg';
import logoSalesforce from './assets/logos/salesforce.svg';
import logoGoogleDrive from './assets/logos/google-drive.svg';
import logoGmail from './assets/logos/gmail.svg';
import logoGoogleCalendar from './assets/logos/google-calendar.svg';
import logoAirtable from './assets/logos/airtable.svg';
import logoAsana from './assets/logos/asana.svg';
import logoClickup from './assets/logos/clickup.svg';
import logoNotion from './assets/logos/notion.svg';
import logoHubspot from './assets/logos/hubspot.svg';
import logoQuickbooks from './assets/logos/quickbooks.svg';
import logoXero from './assets/logos/xero.svg';
import logoZapier from './assets/logos/zapier.svg';
import logoMake from './assets/logos/make.svg';
import logoJira from './assets/logos/jira.svg';
import logoTrello from './assets/logos/trello.svg';

const navItems = [
  { id: 'assistant', label: 'Lucy', icon: Sparkles },
  { id: 'documents', label: 'Sources', icon: Database },
  { id: 'model', label: 'Operating Model', icon: Layers3 }
];

const ASSISTANT_NAME = 'Lucy';

const assistantStarters = [
  'How does this business run day to day?',
  'Who owns what across the team?',
  'Where are the biggest risks or bottlenecks?',
  'What rules govern approvals and spending?'
];

const connectSources = [
  { name: 'Google Drive', image: logoGoogleDrive, detail: 'Sync folders & files' },
  { name: 'Notion', image: logoNotion, detail: 'Import internal docs' },
  { name: 'Gmail', image: logoGmail, detail: 'Learn from email' },
  { name: 'HubSpot', image: logoHubspot, detail: 'Connect CRM records' },
  { name: 'Airtable', image: logoAirtable, detail: 'Map structured data' },
  { name: 'Website / URL', glyphIcon: Globe, color: '#0d9488', detail: 'Crawl a public page' }
];

const externalPlugins = [
  { name: 'ChatGPT', category: 'AI assistant', image: logoOpenai, use: 'Ground answers, actions, and planning in company documents.' },
  { name: 'Microsoft Copilot', category: 'AI assistant', image: logoCopilot, use: 'Bring Orgni context into Microsoft 365 work.' },
  { name: 'Slack', category: 'Team chat', image: logoSlack, use: 'Answer operational questions inside channels.' },
  { name: 'Microsoft Teams', category: 'Team chat', image: logoTeams, use: 'Give teams shared business context during work.' },
  { name: 'Google Drive', category: 'Files', image: logoGoogleDrive, use: 'Use Drive folders as business knowledge sources.' },
  { name: 'Gmail', category: 'Email', image: logoGmail, use: 'Draft replies and classify requests with business context.' },
  { name: 'Google Calendar', category: 'Calendar', image: logoGoogleCalendar, use: 'Connect meetings to workflows, owners, and next steps.' },
  { name: 'Notion', category: 'Docs', image: logoNotion, use: 'Keep internal docs synced with Orgni knowledge.' },
  { name: 'HubSpot', category: 'CRM', image: logoHubspot, use: 'Make customer workflows aware of internal rules.' },
  { name: 'Salesforce', category: 'CRM', image: logoSalesforce, use: 'Give sales and service teams approved context.' },
  { name: 'QuickBooks', category: 'Finance', image: logoQuickbooks, use: 'Connect finance rules, approvals, and exceptions.' },
  { name: 'Xero', category: 'Finance', image: logoXero, use: 'Support finance controls with operational context.' },
  { name: 'Zapier', category: 'Automation', image: logoZapier, use: 'Trigger workflows from trusted business context.' },
  { name: 'Make', category: 'Automation', image: logoMake, use: 'Build automations around extracted roles and rules.' },
  { name: 'Asana', category: 'Work management', image: logoAsana, use: 'Turn gaps and next steps into trackable work.' },
  { name: 'Jira', category: 'Work management', image: logoJira, use: 'Route operational findings into delivery queues.' },
  { name: 'Trello', category: 'Work management', image: logoTrello, use: 'Create boards from workflows, risks, and actions.' },
  { name: 'Airtable', category: 'Database', image: logoAirtable, use: 'Map structured operations data to business memory.' },
  { name: 'ClickUp', category: 'Work management', image: logoClickup, use: 'Push Orgni tasks into team execution spaces.' }
];

const actionTypes = [
  { type: 'task_list', label: 'Task list', icon: ClipboardList },
  { type: 'workflow_summary', label: 'Workflow summary', icon: Layers3 },
  { type: 'flag_missing', label: 'Missing information', icon: AlertTriangle },
  { type: 'next_step', label: 'Next step', icon: ArrowRight },
  { type: 'draft_message', label: 'Team update', icon: FileText }
];

// Concrete examples of the business context Orgni serves to each native product.
// Field names match the real /engine/context/:domain responses.
const productExposes = {
  workflow: {
    endpoint: 'GET /api/orgs/:orgId/engine/context/workflow',
    fields: [
      ['workflows', 'Name, trigger, steps, owner, decision & approval points'],
      ['roles', 'Who does what, plus decision and approval authority'],
      ['dependencies', 'Where people and processes depend on each other'],
      ['bottlenecks', 'Friction points that slow work down'],
      ['blueprint', 'AI execution boundaries and required human approvals']
    ],
    example: `{
  "orgId": "org_clover",
  "domain": "workflow",
  "context": {
    "workflows": [{
      "workflow_name": "Invoice Approval",
      "trigger": "Supplier invoice received",
      "steps": ["Match invoice to delivery record", "Route by amount", "Approve"],
      "owner": "Finance Assistant",
      "approval_points": ["Finance Manager approval over R5,000"]
    }],
    "roles": [{ "role": "Finance Manager", "approval_authority": ["Up to R50,000"] }],
    "bottlenecks": ["Manual invoice matching"]
  },
  "confidence": 0.85,
  "version": 5
}`
  },
  finance: {
    endpoint: 'GET /api/orgs/:orgId/engine/context/finance',
    fields: [
      ['rules', 'Condition \u2192 action, with a risk level'],
      ['approvals', 'Trigger, approver, and threshold'],
      ['exceptions', 'Documented deviations from the rules'],
      ['risks', 'Control weaknesses Orgni detected'],
      ['gaps', 'Missing controls or undocumented steps']
    ],
    example: `{
  "orgId": "org_clover",
  "domain": "finance",
  "context": {
    "rules": [{
      "rule_name": "High-value payment approval",
      "condition": "amount > 5000",
      "action": "require_manager_approval",
      "risk_level": "medium"
    }],
    "approvals": [{ "trigger": "Refund", "approver": "Store Manager", "threshold": "R2,000" }],
    "risks": [{ "risk": "Manual invoice matching may miss discrepancies", "severity": "medium" }]
  },
  "confidence": 0.85,
  "version": 5
}`
  }
};

async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: isForm ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
  } catch {
    // Backend unreachable (e.g. frontend-only deployment) — use on-device storage.
    return localApi(path, options);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // No JSON API responding here (static host / SPA fallback) — use on-device storage.
    return localApi(path, options);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.details?.join(', ') || data.error || data.message || response.statusText;
    throw new Error(detail);
  }
  return data;
}

function emptyProfile() {
  return {
    name: '',
    businessType: '',
    departmentsText: '',
    workflowsText: '',
    toolsText: '',
    problemsText: ''
  };
}

function toLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function fromLines(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function summaryText(summary) {
  if (!summary) return '';
  if (typeof summary === 'string') return summary;
  return summary.plain_english_summary
    || summary.core_function
    || summary.business_name
    || '';
}

function time(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

const CHAT_STORE_PREFIX = 'orgni:chat:';

function loadChat(orgId) {
  try {
    const raw = localStorage.getItem(CHAT_STORE_PREFIX + orgId);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChat(orgId, messages) {
  try {
    if (!messages || messages.length === 0) {
      localStorage.removeItem(CHAT_STORE_PREFIX + orgId);
    } else {
      localStorage.setItem(CHAT_STORE_PREFIX + orgId, JSON.stringify(messages));
    }
  } catch {
    /* storage unavailable / over quota — non-fatal */
  }
}

const MODEL_LEGACY = { review: 'findings', validation: 'findings', workflows: 'workflows', exceptions: 'issues' };

export function App() {
  const [view, setView] = useState('assistant');
  const [modelTab, setModelTab] = useState('map');
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState('');
  const [docs, setDocs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [context, setContext] = useState(null);
  const [workflowContext, setWorkflowContext] = useState(null);
  const [financeContext, setFinanceContext] = useState(null);
  const [validation, setValidation] = useState(null);
  const [workflows, setWorkflows] = useState({ workflows: [], detected: [] });
  const [exceptions, setExceptions] = useState({ exceptions: [], stats: {} });
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [profile, setProfile] = useState(emptyProfile);
  const [actionResult, setActionResult] = useState(null);
  const [actionContext, setActionContext] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSending, setChatSending] = useState(false);
  const hydratingChat = useRef(false);

  const currentOrg = useMemo(() => orgs.find((org) => org.id === orgId), [orgs, orgId]);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    hydratingChat.current = true;
    setChatMessages(loadChat(orgId));
    refreshOrgData(orgId);
  }, [orgId]);

  // Persist the conversation per-org so it survives reloads and tab switches.
  // Skip the first run after an org switch so we never write the previous
  // org's messages under the newly selected org's key.
  useEffect(() => {
    if (!orgId) return;
    if (hydratingChat.current) {
      hydratingChat.current = false;
      return;
    }
    saveChat(orgId, chatMessages);
  }, [orgId, chatMessages]);

  useEffect(() => {
    if (!currentOrg) return;
    setProfile({
      name: currentOrg.name || '',
      businessType: currentOrg.businessType || '',
      departmentsText: toLines(currentOrg.departments),
      workflowsText: toLines(currentOrg.keyWorkflows),
      toolsText: toLines(currentOrg.currentTools),
      problemsText: toLines(currentOrg.mainProblems)
    });
  }, [currentOrg]);

  async function initialize() {
    setBusy('Loading Orgni');
    try {
      const orgData = await api('/api/orgs');
      setOrgs(orgData.organizations || []);
      setOrgId(orgData.organizations?.[0]?.id || '');
      if (!orgData.organizations?.length) setShowCreate(true);
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function refreshOrgData(nextOrgId = orgId) {
    if (!nextOrgId) return;
    try {
      const [dash, docData, valData, histData, wfData, exData] = await Promise.all([
        api(`/api/orgs/${nextOrgId}/dashboard`),
        api(`/api/orgs/${nextOrgId}/documents`),
        api(`/api/orgs/${nextOrgId}/engine/validation`).catch(() => null),
        api(`/api/orgs/${nextOrgId}/engine/history`).catch(() => ({ versions: [] })),
        api(`/api/orgs/${nextOrgId}/workflows`).catch(() => ({ workflows: [], detected: [] })),
        api(`/api/orgs/${nextOrgId}/exceptions`).catch(() => ({ exceptions: [], stats: {} }))
      ]);
      const hasKnowledgeMap = dash.knowledge?.status === 'ready' || Boolean(dash.summary);
      const ctxData = hasKnowledgeMap
        ? await api(`/api/orgs/${nextOrgId}/engine/context`).catch(() => ({ context: null }))
        : { context: null };
      setDashboard(dash);
      setDocs(docData.documents || []);
      setContext(ctxData.context || null);
      setValidation(valData);
      setWorkflows(wfData || { workflows: [], detected: [] });
      setExceptions(exData || { exceptions: [], stats: {} });
      setHistory(histData.versions || []);
      if (ctxData.context) {
        const [workflow, finance] = await Promise.all([
          api(`/api/orgs/${nextOrgId}/engine/context/workflow`).catch(() => null),
          api(`/api/orgs/${nextOrgId}/engine/context/finance`).catch(() => null)
        ]);
        setWorkflowContext(workflow?.context || workflow || null);
        setFinanceContext(finance?.context || finance || null);
      } else {
        setWorkflowContext(null);
        setFinanceContext(null);
      }
    } catch (error) {
      toast(error.message, 'danger');
    }
  }

  function toast(message, tone = 'info') {
    setNotice({ message, tone });
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => setNotice(null), 4200);
  }

  async function createOrg({ files, name } = {}) {
    const list = files ? [...files] : [];
    const derivedName =
      (name || '').trim() ||
      (list[0]?.name ? list[0].name.replace(/\.[^./\\]+$/, '').trim() : '') ||
      'My business';
    setBusy('Creating business');
    try {
      const data = await api('/api/orgs', {
        method: 'POST',
        body: JSON.stringify({
          name: derivedName,
          businessType: '',
          departments: [],
          keyWorkflows: [],
          currentTools: [],
          mainProblems: []
        })
      });
      const newOrg = data.organization;
      setOrgs((items) => [...items, newOrg]);
      setOrgId(newOrg.id);
      setShowCreate(false);

      if (list.length) {
        setBusy('Uploading your document');
        const body = new FormData();
        list.forEach((file) => body.append('files', file));
        try {
          const uploaded = await api(`/api/orgs/${newOrg.id}/documents`, { method: 'POST', body });
          toast(uploaded.message || 'Document uploaded', uploaded.rejected?.length ? 'warn' : 'success');
        } catch (uploadError) {
          toast(uploadError.message, 'danger');
        }
        await refreshOrgData(newOrg.id);
        setView('documents');
      } else {
        toast('Business created', 'success');
      }
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  function logout() {
    window.location.href = '/';
  }

  async function sendChat(text, mode = 'ask') {
    const content = text.trim();
    if (!content || chatSending || !orgId) return;

    const history = [...chatMessages, { role: 'user', content, mode }];
    setChatMessages(history);
    setChatSending(true);
    try {
      const data = await api(`/api/orgs/${orgId}/engine/chat`, {
        method: 'POST',
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), mode })
      });
      setChatMessages([
        ...history,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
          grounded: data.grounded,
          confidence: data.confidence ?? null,
          workflow: data.workflow || null,
          rules: data.rules || [],
          risks: data.risks || [],
          missing: data.missing || [],
          suggestedActions: data.suggestedActions || [],
          trail: data.trail || null,
          question: content,
          attachment: data.grounded ? buildAttachment(content, context) : null
        }
      ]);
    } catch (error) {
      setChatMessages([
        ...history,
        { role: 'assistant', content: `I hit a snag answering that: ${error.message}`, error: true }
      ]);
    } finally {
      setChatSending(false);
    }
  }

  // Navigate, mapping legacy view ids into the merged Operating Model tabs.
  function goTo(target) {
    const tab = MODEL_LEGACY[target];
    if (tab) { setModelTab(tab); setView('model'); }
    else if (target === 'map' || target === 'findings' || target === 'workflows' || target === 'issues') { setModelTab(target); setView('model'); }
    else setView(target);
  }

  // Turn a Lucy suggested action into a real Orgni object using existing handlers.
  async function runAssistantAction(action, msg) {
    if (action.type === 'create_workflow' && msg.workflow) {
      await saveWorkflow({
        name: msg.workflow.name,
        steps: msg.workflow.steps || [],
        status: 'review_needed',
        source: 'assistant'
      });
      goTo('workflows');
    } else if (action.type === 'create_exception') {
      const hasMissing = msg.missing && msg.missing.length;
      await createException({
        title: 'Missing information for review',
        type: hasMissing ? 'missing_document' : 'unsupported_answer',
        severity: 'low',
        relatedType: 'assistant',
        detail: hasMissing
          ? `Missing or unclear from sources: ${msg.missing.join('; ')}`
          : `Lucy could not confirm an answer to: "${msg.question || ''}". Add a source that covers this.`
      });
      goTo('issues');
    } else if (action.type === 'create_risk_exception') {
      await createException({
        title: 'Risk flagged by Lucy',
        type: 'approval_gap',
        severity: 'medium',
        relatedType: 'assistant',
        detail: (msg.risks || []).join('; ') || 'Lucy flagged a control weakness for review.'
      });
      goTo('issues');
    } else if (action.type === 'review_findings') {
      goTo('findings');
    } else if (action.type === 'find_missing') {
      sendChat(msg.question || 'What information is missing or unclear in our sources?', 'find_missing');
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const body = {
      name: profile.name.trim(),
      businessType: profile.businessType.trim(),
      departments: fromLines(profile.departmentsText),
      keyWorkflows: fromLines(profile.workflowsText),
      currentTools: fromLines(profile.toolsText),
      mainProblems: fromLines(profile.problemsText)
    };
    setBusy('Saving profile');
    try {
      const data = await api(`/api/orgs/${orgId}`, { method: 'PATCH', body: JSON.stringify(body) });
      setOrgs((items) => items.map((org) => (org.id === orgId ? data.organization : org)));
      toast('Profile saved', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function uploadFiles(files) {
    if (!files?.length || !orgId) return;
    const body = new FormData();
    [...files].forEach((file) => body.append('files', file));
    setBusy('Uploading documents');
    try {
      const data = await api(`/api/orgs/${orgId}/documents`, { method: 'POST', body });
      toast(data.message || 'Documents uploaded', data.rejected?.length ? 'warn' : 'success');
      await refreshOrgData();
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function deleteDocument(docId) {
    setBusy('Deleting document');
    try {
      await api(`/api/orgs/${orgId}/documents/${docId}`, { method: 'DELETE' });
      await refreshOrgData();
      toast('Document deleted', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function runIntake() {
    setBusy('Building Knowledge Map');
    try {
      const result = await api(`/api/orgs/${orgId}/engine/intake`, { method: 'POST' });
      toast(`Knowledge map v${result.version} created`, 'success');
      await refreshOrgData();
      goTo('map');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function runAction(type) {
    setBusy('Generating action');
    setActionResult(null);
    try {
      const result = await api(`/api/orgs/${orgId}/engine/actions`, {
        method: 'POST',
        body: JSON.stringify({ type, context: actionContext })
      });
      setActionResult(result);
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function reviewFinding(id, mode, patch) {
    if (mode === 'edit') {
      setBusy('Saving finding');
      try {
        await api(`/api/orgs/${orgId}/engine/validation/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ reviewedBy: 'Orgni UI', ...patch })
        });
        await refreshOrgData();
        toast('Finding updated', 'success');
      } catch (error) {
        toast(error.message, 'danger');
      } finally {
        setBusy('');
      }
      return;
    }
    setBusy(mode === 'confirm' ? 'Confirming finding' : 'Rejecting finding');
    try {
      await api(`/api/orgs/${orgId}/engine/validation/${id}/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ reviewedBy: 'Orgni UI', reason: mode === 'reject' ? 'Rejected in review' : '' })
      });
      await refreshOrgData();
      toast(mode === 'confirm' ? 'Finding confirmed' : 'Finding rejected', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function saveWorkflow(payload, id) {
    setBusy(id ? 'Saving workflow' : 'Creating workflow');
    try {
      if (id) {
        await api(`/api/orgs/${orgId}/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api(`/api/orgs/${orgId}/workflows`, { method: 'POST', body: JSON.stringify(payload) });
      }
      await refreshOrgData();
      toast(id ? 'Workflow saved' : 'Workflow created', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function deleteWorkflow(id) {
    setBusy('Deleting workflow');
    try {
      await api(`/api/orgs/${orgId}/workflows/${id}`, { method: 'DELETE' });
      await refreshOrgData();
      toast('Workflow deleted', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function scanExceptions() {
    setBusy('Scanning for issues');
    try {
      const result = await api(`/api/orgs/${orgId}/exceptions/scan`, { method: 'POST' });
      await refreshOrgData();
      toast(result.created ? `${result.created} new issue(s) found` : 'No new issues found', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function createException(payload) {
    setBusy('Adding issue');
    try {
      await api(`/api/orgs/${orgId}/exceptions`, { method: 'POST', body: JSON.stringify(payload) });
      await refreshOrgData();
      toast('Issue added', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  async function updateException(id, payload) {
    setBusy('Updating issue');
    try {
      await api(`/api/orgs/${orgId}/exceptions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await refreshOrgData();
      toast('Issue updated', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  const content = !currentOrg ? (
    <EmptyState title="Create your business" body="Orgni needs one business profile before documents can be mapped." action={<button className="primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New business</button>} />
  ) : (
    <>
      {view === 'home' && <Home dashboard={dashboard} onNavigate={goTo} onIntake={runIntake} hasDocs={docs.length > 0} />}
      {view === 'documents' && <Documents docs={docs} onUpload={uploadFiles} onDelete={deleteDocument} onIntake={runIntake} onConnect={(name) => toast(`${name} connections are coming soon — upload files for now.`, 'info')} />}
      {view === 'model' && (
        <OperatingModel
          tab={modelTab}
          onTab={setModelTab}
          context={context}
          validation={validation}
          onReview={reviewFinding}
          workflows={workflows}
          onSaveWorkflow={saveWorkflow}
          onDeleteWorkflow={deleteWorkflow}
          exceptions={exceptions}
          onScanExceptions={scanExceptions}
          onCreateException={createException}
          onUpdateException={updateException}
        />
      )}
      {view === 'assistant' && <Assistant org={currentOrg} context={context} messages={chatMessages} sending={chatSending} onSend={sendChat} onReset={() => setChatMessages([])} onSource={() => setView('documents')} onOpenMap={() => goTo('map')} onAction={runAssistantAction} dashboard={dashboard} validation={validation} exceptions={exceptions} docCount={docs.length} />}
      {view === 'actions' && <Actions actionContext={actionContext} setActionContext={setActionContext} result={actionResult} onRun={runAction} />}
      {view === 'plugins' && <PluginsCatalog onOpen={setView} />}
      {view === 'workflowPlugin' && <WorkflowPlugin context={workflowContext} onSource={() => setView('documents')} />}
      {view === 'financePlugin' && <FinancePlugin context={financeContext} onSource={() => setView('documents')} />}
      {view === 'profile' && <Profile profile={profile} setProfile={setProfile} onSave={saveProfile} currentOrg={currentOrg} onLogout={logout} />}
    </>
  );

  const modelAttention = (dashboard?.counts?.findingsNeedingReview || 0) + (dashboard?.counts?.exceptionsOpen || 0);
  const navBadge = { documents: docs.length || 0, model: modelAttention };
  const navTone = { model: 'attention' };

  return (
    <div className="shell">
      <aside className="ios-rail" aria-label="Sidebar">
        <div className="ios-brand">
          <span className="ios-logo"><img src={orgniLogo} alt="Orgni logo" /></span>
          <span className="ios-brand-text">
            <strong>Orgni</strong>
            <small>{currentOrg?.name || 'Operating model'}</small>
          </span>
        </div>

        <nav className="ios-nav" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            const badge = navBadge[item.id] || 0;
            return (
              <button
                key={item.id}
                className={`ios-item ${active ? 'active' : ''}`}
                onClick={() => (item.id === 'model' ? goTo('map') : setView(item.id))}
                aria-pressed={active}
              >
                <span className="ios-icon"><Icon size={17} /></span>
                <span className="ios-label">{item.label}</span>
                {badge > 0 && (
                  <span
                    className={`ios-badge ${navTone[item.id] || ''}`}
                    aria-label={navTone[item.id] === 'attention' ? `${badge} item${badge === 1 ? '' : 's'} need attention` : `${badge}`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          className={`ios-item ios-profile ${view === 'profile' ? 'active' : ''}`}
          onClick={() => setView('profile')}
          aria-pressed={view === 'profile'}
        >
          <span className="ios-icon"><Building2 size={17} /></span>
          <span className="ios-label">Profile</span>
        </button>
      </aside>

      <main className={view === 'model' && modelTab === 'map' ? 'main--map' : ''}>
        {content}
      </main>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onSubmit={createOrg} />}
      {notice && <div className={`toast ${notice.tone}`}>{notice.message}</div>}
      {busy && <div className="busy"><Loader2 size={20} /> {busy}</div>}
    </div>
  );
}

function formatAssistant(text, withCaret) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let list = null;

  const renderInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="chat-code">{part.slice(1, -1)}</code>;
      return <span key={i}>{part}</span>;
    });
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { list = null; return; }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) { list = null; blocks.push({ type: 'h', text: heading[2] }); return; }

    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (!list || list.type !== 'ol') { list = { type: 'ol', items: [] }; blocks.push(list); }
      list.items.push(ordered[1]);
      return;
    }

    const bullet = line.match(/^[-•*]\s+(.*)$/);
    if (bullet) {
      if (!list || list.type !== 'ul') { list = { type: 'ul', items: [] }; blocks.push(list); }
      list.items.push(bullet[1]);
      return;
    }

    list = null;
    blocks.push({ type: 'p', text: line });
  });

  const caret = <span className="chat-caret" aria-hidden="true" />;
  if (withCaret && blocks.length === 0) return [<p key="caret">{caret}</p>];

  return blocks.map((block, i) => {
    const last = withCaret && i === blocks.length - 1;
    if (block.type === 'h') {
      return <h4 key={i} className="chat-h">{renderInline(block.text)}{last && caret}</h4>;
    }
    if (block.type === 'ul' || block.type === 'ol') {
      const Tag = block.type === 'ol' ? 'ol' : 'ul';
      return (
        <Tag key={i} className={`chat-list ${block.type === 'ol' ? 'chat-ol' : ''}`}>
          {block.items.map((it, j) => (
            <li key={j}>{renderInline(it)}{last && j === block.items.length - 1 && caret}</li>
          ))}
        </Tag>
      );
    }
    return <p key={i}>{renderInline(block.text)}{last && caret}</p>;
  });
}

function AssistantAttachment({ attachment, onOpenMap }) {
  if (!attachment) return null;

  if (attachment.kind === 'map') {
    return (
      <button type="button" className="assist-card assist-map" onClick={onOpenMap}>
        <div className="assist-card-head">
          <span className="assist-card-icon"><Map size={15} /></span>
          <strong>{attachment.business.label} · operating map</strong>
          <ArrowUpRight size={16} className="assist-card-open" />
        </div>
        <div className="assist-stats">
          {attachment.business.stats.map((s) => (
            <span key={s.label} className="assist-stat"><b>{s.value}</b><em>{s.label}</em></span>
          ))}
        </div>
        <div className="assist-chips">
          {attachment.groups.map((g) => (
            <span key={g.key} className={`assist-chip ${g.key}`}>{g.label} · {g.count}</span>
          ))}
        </div>
      </button>
    );
  }

  const meta = CATEGORY_META[attachment.key] || { icon: Layers3 };
  const Icon = meta.icon;
  const shown = attachment.items.slice(0, 8);
  const extra = attachment.count - shown.length;

  return (
    <div className={`assist-card assist-list ${attachment.key}`}>
      <div className="assist-card-head">
        <span className="assist-card-icon"><Icon size={15} /></span>
        <strong>{attachment.label}</strong>
        <span className="assist-card-count">{attachment.count}</span>
      </div>
      <ul className="assist-items">
        {shown.map((label, i) => <li key={i}>{label}</li>)}
      </ul>
      {extra > 0 && <p className="assist-more">+{extra} more</p>}
      <button type="button" className="assist-open-link" onClick={onOpenMap}>
        Open in Knowledge map <ArrowRight size={13} />
      </button>
    </div>
  );
}

const LUCY_MODES = [
  { id: 'ask', label: 'Ask' },
  { id: 'explain', label: 'Explain' },
  { id: 'evidence', label: 'Find evidence' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'create_workflow', label: 'Create workflow' },
  { id: 'check_risk', label: 'Check risk' },
  { id: 'find_missing', label: 'Find missing info' }
];

const ACTION_ICON = {
  create_workflow: Workflow,
  create_exception: AlertTriangle,
  create_risk_exception: ShieldCheck,
  review_findings: ShieldCheck,
  find_missing: Brain
};

const ACTION_LABEL = {
  create_workflow: 'Create workflow',
  create_exception: 'Mark as issue',
  create_risk_exception: 'Mark as issue',
  review_findings: 'Review finding',
  find_missing: 'Find missing info'
};

function confidenceLabel(c) {
  if (c >= 0.8) return 'high';
  if (c >= 0.55) return 'medium';
  return 'low';
}

// The structured analysis Lucy attaches under her conversational answer:
// evidence, confidence, workflow, missing info, actions and the audit trail.
function LucyAnalysis({ msg, onAction, onOpenMap }) {
  const [showTrail, setShowTrail] = useState(false);
  const hasConfidence = typeof msg.confidence === 'number';
  const sources = msg.sources || [];
  const workflow = msg.workflow;
  const missing = msg.missing || [];
  const risks = msg.risks || [];
  const rules = msg.rules || [];
  const actions = msg.suggestedActions || [];
  const trail = msg.trail;

  const nothing = !hasConfidence && !sources.length && !workflow && !missing.length
    && !risks.length && !rules.length && !actions.length && !trail;
  if (nothing) return null;

  return (
    <div className="lucy-analysis">
      {(hasConfidence || sources.length > 0) && (
        <div className="lucy-evidence">
          {hasConfidence && (
            <span className={`lucy-confidence ${confidenceLabel(msg.confidence)}`}>
              <ShieldCheck size={12} /> Confidence {Math.round(msg.confidence * 100)}%
            </span>
          )}
          {sources.map((src, idx) => (
            <span key={src.id || idx} className="chat-source-chip">
              <FileText size={12} /> {src.name}{src.location ? ` · ${src.location}` : ''}
            </span>
          ))}
        </div>
      )}

      {workflow && workflow.steps?.length > 0 && (
        <div className="lucy-card">
          <div className="lucy-card-head"><Workflow size={14} /> Workflow found · {workflow.name}</div>
          <ol className="lucy-steps">
            {workflow.steps.map((s, idx) => <li key={idx}>{s}</li>)}
          </ol>
        </div>
      )}

      {rules.length > 0 && (
        <div className="lucy-card">
          <div className="lucy-card-head"><Scale size={14} /> Rules found</div>
          <ul className="lucy-list">{rules.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
        </div>
      )}

      {risks.length > 0 && (
        <div className="lucy-card warn">
          <div className="lucy-card-head"><AlertTriangle size={14} /> Risks &amp; control gaps</div>
          <ul className="lucy-list">{risks.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="lucy-card warn">
          <div className="lucy-card-head"><AlertTriangle size={14} /> Missing / unclear</div>
          <ul className="lucy-list">{missing.map((m, idx) => <li key={idx}>{m}</li>)}</ul>
        </div>
      )}

      {actions.length > 0 && (
        <div className="lucy-actions">
          {actions.map((a) => {
            const Icon = ACTION_ICON[a.type] || ArrowRight;
            return (
              <button key={a.type} className="lucy-action" onClick={() => onAction(a, msg)}>
                <Icon size={14} /> {ACTION_LABEL[a.type] || a.label}
              </button>
            );
          })}
        </div>
      )}

      {trail && (
        <div className="lucy-trail">
          <button className="lucy-trail-toggle" onClick={() => setShowTrail((v) => !v)}>
            <Brain size={13} /> How Lucy reached this
            <ChevronRight size={13} className={showTrail ? 'open' : ''} />
          </button>
          {showTrail && (
            <ul className="lucy-trail-list">
              <li>Searched {trail.documentsSearched} document{trail.documentsSearched === 1 ? '' : 's'}</li>
              <li>Used {trail.sectionsUsed} relevant section{trail.sectionsUsed === 1 ? '' : 's'}</li>
              <li>Found {trail.conflicts} conflict{trail.conflicts === 1 ? '' : 's'} between sources</li>
              {typeof msg.confidence === 'number' && <li>Confidence: {Math.round(msg.confidence * 100)}%</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Assistant({ org, context, messages, sending, onSend, onReset, onSource, onOpenMap, onAction, dashboard, validation, exceptions, docCount }) {
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('ask');
  const scrollRef = useRef(null);
  const ready = Boolean(context);
  const empty = messages.length === 0;

  const sourcesIndexed = docCount ?? (dashboard?.documents ?? 0);
  const avgConfidence = validation?.stats?.averageConfidence;
  const reviewNeeded = validation?.stats?.needsReview ?? 0;
  const openExceptions = (exceptions?.exceptions || []).filter((e) => e.status !== 'resolved' && e.status !== 'dismissed').length;

  // Reveal each new assistant reply character-by-character (client-side
  // "typing" — the backend returns the whole answer at once).
  const [typed, setTyped] = useState(0);
  const [typingIdx, setTypingIdx] = useState(-1);
  const seenCount = useRef(messages.length);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (messages.length > seenCount.current && last && last.role === 'assistant' && !last.error) {
      setTypingIdx(messages.length - 1);
      setTyped(0);
    }
    seenCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (typingIdx < 0) return undefined;
    const full = messages[typingIdx]?.content || '';
    if (typed >= full.length) return undefined;
    // Reveal faster for longer answers so big replies don't crawl.
    const step = full.length > 600 ? 5 : full.length > 240 ? 3 : 2;
    const id = setTimeout(() => setTyped((t) => Math.min(full.length, t + step)), 12);
    return () => clearTimeout(id);
  }, [typed, typingIdx, messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, typed]);

  function submit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(draft, mode);
    setDraft('');
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(event);
    }
  }

  return (
    <section className="chat-screen">
      <header className="chat-head">
        <div className="chat-head-id">
          <h1>Operations analyst</h1>
        </div>
        {!empty && <button className="ghost chat-reset" onClick={onReset}><Plus size={15} /> New chat</button>}
      </header>

      {ready && (
        <div className="lucy-context-strip">
          <div className="lucy-stat"><span>{sourcesIndexed}</span> sources indexed</div>
          <div className="lucy-stat">
            <span>{typeof avgConfidence === 'number' ? `${Math.round(avgConfidence * 100)}%` : '—'}</span> knowledge confidence
          </div>
          <div className="lucy-stat"><span>{reviewNeeded}</span> review needed</div>
          <div className="lucy-stat"><span>{openExceptions}</span> open issues</div>
        </div>
      )}

      <div className={`chat-stream ${empty ? 'is-empty' : ''}`} ref={scrollRef}>
        {empty ? (
          <div className="chat-welcome">
            <h2>{ready ? 'How can I help?' : "Let's get me up to speed."}</h2>
            <p>
              {ready
                ? `I'm your operations analyst for ${org?.name || 'this business'}. Ask me about a process, rule or risk and I'll give you a grounded answer — with evidence, what's still unclear, and the next action you can take.`
                : `I don't have enough business context yet. Upload an SOP, policy, invoice, spreadsheet or process document and build the map, then I can map your workflows and rules.`}
            </p>
            {ready ? (
              <div className="chat-starters">
                {assistantStarters.map((s) => (
                  <button key={s} className="chat-starter" onClick={() => onSend(s, mode)}>
                    <span>{s}</span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <button className="primary" onClick={onSource}><UploadCloud size={16} /> Add sources</button>
            )}
          </div>
        ) : (
          <div className="chat-thread">
            {messages.map((msg, i) => {
              const isAssistant = msg.role === 'assistant';
              const typingThis = isAssistant && i === typingIdx && typed < msg.content.length;
              const shown = typingThis ? msg.content.slice(0, typed) : msg.content;
              return (
                <div key={i} className={`chat-row ${msg.role}`}>
                  <div className="chat-bubble-col">
                    <div className={`chat-bubble ${msg.role} ${msg.error ? 'error' : ''}`}>
                      {isAssistant ? formatAssistant(shown, typingThis) : <p>{msg.content}</p>}
                    </div>
                    {isAssistant && !typingThis && !msg.error && (
                      <LucyAnalysis msg={msg} onAction={onAction} onOpenMap={onOpenMap} />
                    )}
                    {isAssistant && !typingThis && msg.attachment && (
                      <AssistantAttachment attachment={msg.attachment} onOpenMap={onOpenMap} />
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="chat-row assistant">
                <div className="chat-bubble assistant">
                  <span className="chat-typing"><i /><i /><i /></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="chat-dock">
        <div className="lucy-modes" role="tablist" aria-label="Lucy modes">
          {LUCY_MODES.map((m) => (
            <button
              key={m.id}
              className={`lucy-mode ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
              disabled={!ready}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <textarea
            rows={1}
            value={draft}
            placeholder={ready ? `Ask Lucy to ${(LUCY_MODES.find((m) => m.id === mode)?.label || 'Ask').toLowerCase()}…` : 'Add sources to start chatting…'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!ready || sending}
          />
          <button type="submit" className="chat-send" disabled={!ready || sending || !draft.trim()} aria-label="Send">
            {sending ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </section>
  );
}

function ExposesPanel({ title, intro, data }) {
  return (
    <div className="panel span-2 exposes-panel">
      <PanelHeader icon={Sparkles} title={title} />
      <p className="lead">{intro}</p>
      <dl className="exposes-fields">
        {data.fields.map(([key, desc]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>
      <p className="exposes-endpoint">{data.endpoint}</p>
      <pre className="exposes-example">{data.example}</pre>
    </div>
  );
}

function WorkflowPlugin({ context, onSource }) {
  return (
    <section className="view-grid">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">Plugin</p>
          <h2>Workflow</h2>
          <p>Operational context for process design: workflows, roles, dependencies, bottlenecks, and AI execution boundaries.</p>
        </div>
        <img className="hero-logo" src={orgniWorkflowLogo} alt="Orgni Workflow" />
      </div>

      <ExposesPanel
        title="What Orgni exposes to Workflow"
        intro="Orgni serves this business context to the Workflow product through one read-only endpoint. The fields below live inside the response's context object — here is the full shape with a real example."
        data={productExposes.workflow}
      />

      {context ? (
        <>
          <div className="stats">
            <Metric label="Workflows" value={count(context.workflows)} />
            <Metric label="Roles" value={count(context.roles)} />
            <Metric label="Dependencies" value={count(context.dependencies)} />
            <Metric label="Bottlenecks" value={count(context.bottlenecks)} />
          </div>
          <div className="panel span-2">
            <PanelHeader icon={Layers3} title="Live workflow context" />
            <List items={(context.workflows || []).map((item) => item.workflow_name || item.name)} fallback="No workflows extracted yet." />
          </div>
          <div className="panel">
            <PanelHeader icon={AlertTriangle} title="Bottlenecks" />
            <List items={(context.bottlenecks || []).map((item) => item.bottleneck || item)} fallback="No bottlenecks extracted yet." />
          </div>
          <div className="panel">
            <PanelHeader icon={Map} title="Missing information" />
            <List items={(context.missingInformation || []).map((item) => item.item || item.gap || item)} fallback="No missing workflow information flagged." />
          </div>
        </>
      ) : (
        <div className="panel span-2">
          <PanelHeader icon={UploadCloud} title="No live context yet" />
          <p className="lead">Build a knowledge map and Workflow will show your real workflows, roles, and bottlenecks here.</p>
          <button className="primary" onClick={onSource}><UploadCloud size={16} /> Add documents</button>
        </div>
      )}
    </section>
  );
}

function FinancePlugin({ context, onSource }) {
  return (
    <section className="view-grid">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">Plugin</p>
          <h2>Finance</h2>
          <p>Financial operating context for controls: business rules, approvals, exceptions, risks, and gaps.</p>
        </div>
        <img className="hero-logo" src={orgniFinanceLogo} alt="Orgni Finance" />
      </div>

      <ExposesPanel
        title="What Orgni exposes to Finance"
        intro="Orgni serves this financial control context to the Finance product through one read-only endpoint. The fields below live inside the response's context object — here is the full shape with a real example."
        data={productExposes.finance}
      />

      {context ? (
        <>
          <div className="stats">
            <Metric label="Rules" value={count(context.rules)} />
            <Metric label="Approvals" value={count(context.approvals)} />
            <Metric label="Exceptions" value={count(context.exceptions)} />
            <Metric label="Risks" value={count(context.risks)} />
          </div>
          <div className="panel">
            <PanelHeader icon={Check} title="Live rules" />
            <List items={(context.rules || []).map((item) => item.rule || item)} fallback="No finance rules extracted yet." />
          </div>
          <div className="panel">
            <PanelHeader icon={ShieldCheck} title="Approvals" />
            <List items={(context.approvals || []).map((item) => item.approval || item.rule || item)} fallback="No approvals extracted yet." />
          </div>
          <div className="panel span-2">
            <PanelHeader icon={AlertTriangle} title="Risks and gaps" />
            <List items={[...(context.risks || []).map((item) => item.risk || item), ...(context.gaps || []).map((item) => item.gap || item)]} fallback="No finance risks or gaps extracted yet." />
          </div>
        </>
      ) : (
        <div className="panel span-2">
          <PanelHeader icon={UploadCloud} title="No live context yet" />
          <p className="lead">Build a knowledge map and Finance will show your real rules, approvals, and risks here.</p>
          <button className="primary" onClick={onSource}><UploadCloud size={16} /> Add documents</button>
        </div>
      )}
    </section>
  );
}

function PluginsCatalog({ onOpen }) {
  return (
    <section className="view-grid">
      <div className="panel span-2">
        <PanelHeader icon={Plug} title="Plugins" />
        <p className="lead">Connect Orgni's business context to the tools where work already happens.</p>
        <div className="native-plugin-grid">
          <button className="native-plugin" onClick={() => onOpen('workflowPlugin')}>
            <BrandGlyph image={orgniWorkflowLogo} />
            <div>
              <strong>Workflow</strong>
              <span>Roles, steps, dependencies, bottlenecks, and AI execution boundaries.</span>
            </div>
          </button>
          <button className="native-plugin" onClick={() => onOpen('financePlugin')}>
            <BrandGlyph image={orgniFinanceLogo} />
            <div>
              <strong>Finance</strong>
              <span>Rules, approvals, exceptions, risks, gaps, and missing controls.</span>
            </div>
          </button>
        </div>
      </div>

      <div className="panel span-2">
        <PanelHeader icon={Sparkles} title="External tools" />
        <div className="integration-grid">
          {externalPlugins.map((plugin) => (
            <div className="integration-card unavailable" key={plugin.name} aria-disabled="true">
              <BrandGlyph image={plugin.image} iconData={plugin.icon} mark={plugin.mark} color={plugin.color} />
              <div>
                <strong>{plugin.name}</strong>
                <span>{plugin.category}</span>
              </div>
              <span className="integration-soon">Soon</span>
              <p>{plugin.use}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandGlyph({ icon: Icon, iconData, mark, color, image }) {
  if (image) {
    return <span className="brand-glyph brand-glyph-image"><img src={image} alt="" /></span>;
  }
  const brand = color || `#${iconData?.hex || '1d1d1f'}`;
  return (
    <span className="brand-glyph brand-glyph-solid" style={{ '--brand': brand }}>
      {Icon ? <Icon size={20} /> : iconData ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={iconData.path} />
        </svg>
      ) : <span>{mark}</span>}
    </span>
  );
}

function formatBytes(bytes) {
  const b = bytes || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function compactNumber(n) {
  const v = n || 0;
  if (v < 1000) return `${v}`;
  if (v < 1000000) return `${(v / 1000).toFixed(v < 10000 ? 1 : 0)}k`;
  return `${(v / 1000000).toFixed(1)}m`;
}

function docIcon(fileType) {
  const t = String(fileType || '').toLowerCase();
  if (t.includes('csv') || t.includes('xls') || t.includes('sheet')) return FileSpreadsheet;
  if (t.includes('json')) return FileJson;
  if (t.includes('md') || t.includes('html') || t.includes('xml')) return FileCode;
  return FileText;
}

function Documents({ docs, onUpload, onDelete, onIntake, onConnect }) {
  const [dragging, setDragging] = useState(false);

  const indexed = docs.filter((d) => d.status === 'parsed').length;
  const pending = docs.filter((d) => d.status === 'pending').length;
  const failed = docs.filter((d) => d.status === 'failed').length;
  const totalWords = docs.reduce((sum, d) => sum + (d.wordCount || 0), 0);

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer?.files?.length) onUpload(event.dataTransfer.files);
  }

  return (
    <section className="ios-page">
      <header className="ios-page-head">
        <h2>Sources</h2>
        <p>Give Orgni something to learn from — upload your files, or connect a tool where your knowledge already lives.</p>
      </header>

      {docs.length > 0 && (
        <div className="src-stats">
          <div className="src-stat">
            <span className="src-stat-num">{docs.length}</span>
            <span className="src-stat-label">Source{docs.length === 1 ? '' : 's'}</span>
          </div>
          <div className="src-stat">
            <span className="src-stat-num">{indexed}</span>
            <span className="src-stat-label">Indexed</span>
          </div>
          <div className="src-stat">
            <span className="src-stat-num">{compactNumber(totalWords)}</span>
            <span className="src-stat-label">Words</span>
          </div>
          {(pending > 0 || failed > 0) && (
            <div className="src-stat">
              <span className="src-stat-num">{pending + failed}</span>
              <span className="src-stat-label">{failed > 0 ? 'Needs attention' : 'Processing'}</span>
            </div>
          )}
        </div>
      )}

      <label
        className={`ios-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); if (!dragging) setDragging(true); }}
        onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={handleDrop}
      >
        <span className="ios-dropzone-icon"><UploadCloud size={26} /></span>
        <span className="ios-dropzone-text">
          <strong>{dragging ? 'Drop your files to upload' : 'Upload files'}</strong>
          <span>Drag &amp; drop or click to browse · .txt, .md, .csv, .json, .pdf, .docx</span>
        </span>
        <input type="file" multiple onChange={(event) => onUpload(event.target.files)} />
      </label>

      <div className="ios-section-row">
        <p className="ios-section-label">Your sources{docs.length ? ` · ${docs.length}` : ''}</p>
        {docs.length > 0 && (
          <button className="src-build" onClick={onIntake}><Sparkles size={15} /> Build map</button>
        )}
      </div>
      {docs.length ? (
        <div className="ios-list-group">
          {docs.map((doc) => {
            const Icon = docIcon(doc.fileType);
            return (
              <div className="ios-cell ios-cell-doc" key={doc.id}>
                <span className={`ios-doc-icon ${doc.status === 'failed' ? 'is-failed' : ''}`}><Icon size={18} /></span>
                <span className="ios-cell-text">
                  <strong>{doc.name}</strong>
                  <span>{(doc.fileType || 'file').toUpperCase()} · {formatBytes(doc.fileSize)} · {compactNumber(doc.wordCount)} words</span>
                  {doc.parseError && <em>{doc.parseError}</em>}
                </span>
                <span className={`pill ${doc.status}`}>{doc.status}</span>
                <button className="icon-btn danger" title="Remove source" onClick={() => onDelete(doc.id)}><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      ) : (
        <label className="src-empty">
          <span className="src-empty-icon"><UploadCloud size={22} /></span>
          <strong>No sources yet</strong>
          <span>Upload your first file above and Orgni will start learning how your business runs.</span>
          <input type="file" multiple onChange={(event) => onUpload(event.target.files)} />
        </label>
      )}

      <p className="ios-section-label">Connect a source</p>
      <div className="ios-list-group">
        {connectSources.map((src) => (
          <button type="button" className="ios-cell" key={src.name} onClick={() => onConnect(src.name)}>
            <BrandGlyph icon={src.glyphIcon} iconData={src.iconData} image={src.image} color={src.color} />
            <span className="ios-cell-text">
              <strong>{src.name}</strong>
              <span>{src.detail}</span>
            </span>
            <span className="ios-cell-soon">Soon</span>
            <ChevronRight size={18} className="ios-cell-chevron" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_META = {
  department: { label: 'Departments', icon: Building2 },
  role: { label: 'Roles', icon: Users },
  workflow: { label: 'Workflows', icon: Workflow },
  rule: { label: 'Rules', icon: Scale },
  risk: { label: 'Risks', icon: AlertTriangle }
};

function KnowledgeMap({ context, tabBar }) {
  const model = useMemo(() => (context ? buildKnowledgeModel(context) : null), [context]);
  const [selectedId, setSelectedId] = useState('business');

  useEffect(() => { setSelectedId('business'); }, [context]);

  const selected = model ? (model.nodeMap.get(selectedId) || model.nodeMap.get('business')) : null;

  return (
    <section className="km-view">
      <header className="km-view-head">
        <span className="km-view-icon"><Map size={20} /></span>
        <div className="km-view-heading">
          <h2>Operating Model</h2>
          <p>A living map of how {model ? model.business.label : 'your business'} runs — departments, roles, workflows, rules and risks, all extracted from your documents.</p>
        </div>
      </header>
      {tabBar}

      {!model ? (
        <div className="km-body">
          <div className="km-canvas">
            <p className="km-empty-note">No map yet. Upload source documents, then build the map to see how your business runs.</p>
          </div>
        </div>
      ) : (
        <div className="km-body">
          <div className="km-canvas">
            {!model.groups.length
              ? <p className="km-empty-note">No departments, roles, workflows, rules or risks have been extracted yet. Add more detailed source documents and rebuild the map to populate it.</p>
              : <ConceptMap model={model} selectedId={selectedId} onSelect={setSelectedId} />}
          </div>
          <aside className="km-detail">
            <NodeDetail node={selected} context={context} onSelect={setSelectedId} />
          </aside>
        </div>
      )}
    </section>
  );
}

const HUB_VERB = {
  department: 'organized into',
  role: 'run by',
  workflow: 'operates through',
  rule: 'governed by',
  risk: 'exposed to'
};

const CMAP_MIN_SCALE = 0.45;
const CMAP_MAX_SCALE = 2.2;

function edgePath(a, b, bowScale = 0.14, cap = 30) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(len * bowScale, cap);
  const nx = -dy / len;
  const ny = dx / len;
  const cx = (a.x + b.x) / 2 + nx * bow;
  const cy = (a.y + b.y) / 2 + ny * bow;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

function ConceptMap({ model, selectedId, onSelect }) {
  const layout = useMemo(() => buildGraphLayout(model), [model]);
  const { width, height, center, hubs } = layout;
  const viewportRef = useRef(null);
  const [tf, setTf] = useState({ scale: 1, x: 0, y: 0 });
  const [pos, setPos] = useState({});
  const pan = useRef(null);
  const moved = useRef(false);
  const nodeDrag = useRef(null);

  const clamp = (s) => Math.min(CMAP_MAX_SCALE, Math.max(CMAP_MIN_SCALE, s));

  useEffect(() => { setPos({}); }, [layout]);

  const startNodeDrag = (e, id, bx, by) => {
    e.stopPropagation();
    nodeDrag.current = { id, sx: e.clientX, sy: e.clientY, ox: bx, oy: by, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const moveNodeDrag = (e) => {
    const d = nodeDrag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.sx) > 3 || Math.abs(e.clientY - d.sy) > 3) d.moved = true;
    const dx = (e.clientX - d.sx) / tf.scale;
    const dy = (e.clientY - d.sy) / tf.scale;
    setPos((p) => ({ ...p, [d.id]: { x: d.ox + dx, y: d.oy + dy } }));
  };
  const endNodeDrag = (e, id) => {
    const d = nodeDrag.current;
    nodeDrag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (d && !d.moved) onSelect(id);
  };

  const recenter = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setTf({ scale: 1, x: el.clientWidth / 2 - center.x, y: el.clientHeight / 2 - center.y });
  }, [center.x, center.y]);

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const s = clamp(Math.min(el.clientWidth / width, el.clientHeight / height) * 0.88);
    setTf({ scale: s, x: (el.clientWidth - width * s) / 2, y: (el.clientHeight - height * s) / 2 });
  }, [width, height]);

  useEffect(() => {
    recenter();
  }, [recenter]);

  const zoomAt = useCallback((factor, ox, oy) => {
    setTf((v) => {
      const el = viewportRef.current;
      const px = ox ?? (el ? el.clientWidth / 2 : 0);
      const py = oy ?? (el ? el.clientHeight / 2 : 0);
      const next = clamp(v.scale * factor);
      const k = next / v.scale;
      return { scale: next, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (e) => {
    if (e.target.closest('.cmap-node')) return;
    pan.current = { sx: e.clientX, sy: e.clientY, ox: tf.x, oy: tf.y };
    moved.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const p = pan.current;
    if (!p) return;
    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
    setTf((v) => ({ ...v, x: p.ox + dx, y: p.oy + dy }));
  };
  const onPointerUp = (e) => {
    pan.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const onBackgroundClick = () => {
    if (!moved.current) onSelect(null);
  };

  const cpos = pos.business || center;
  const hubView = hubs.map((hub) => ({
    ...hub,
    ...(pos[`hub-${hub.key}`] || { x: hub.x, y: hub.y }),
    leaves: hub.leaves.map((leaf) => ({ ...leaf, ...(pos[leaf.id] || { x: leaf.x, y: leaf.y }) }))
  }));

  return (
    <div
      className={`cmap-viewport${pan.current ? ' panning' : ''}`}
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={onBackgroundClick}
    >
      <div
        className="cmap-stage"
        style={{ width, height, transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})` }}
      >
        <svg className="cmap-edges" width={width} height={height} aria-hidden="true">
          {hubView.map((hub) => {
            const hubActive = selectedId === `hub-${hub.key}`;
            return (
              <g key={`edges-${hub.key}`} className={`cmap-edge-group ${hub.key}`}>
                <path
                  className={`cmap-edge hub${hubActive ? ' active' : ''}`}
                  d={edgePath(cpos, hub, 0.05, 18)}
                  fill="none"
                />
                {hub.leaves.map((leaf) => (
                  <path
                    key={`e-${leaf.id}`}
                    className={`cmap-edge leaf${leaf.id === selectedId ? ' active' : ''}`}
                    d={edgePath(hub, leaf)}
                    fill="none"
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {hubView.map((hub) => (
          <span
            key={`lbl-${hub.key}`}
            className="cmap-elabel"
            style={{ left: (cpos.x + hub.x) / 2, top: (cpos.y + hub.y) / 2 }}
          >
            {hub.verb}
          </span>
        ))}

        <button
          type="button"
          className={`cmap-node center${selectedId === 'business' ? ' active' : ''}`}
          style={{ left: cpos.x, top: cpos.y }}
          onPointerDown={(e) => startNodeDrag(e, 'business', cpos.x, cpos.y)}
          onPointerMove={moveNodeDrag}
          onPointerUp={(e) => endNodeDrag(e, 'business')}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="cmap-center-kicker">Business</span>
          <span className="cmap-center-name">{model.business.label}</span>
        </button>

        {hubView.map((hub) => {
          const meta = CATEGORY_META[hub.key] || { label: hub.label, icon: Layers3 };
          const Icon = meta.icon;
          const hubId = `hub-${hub.key}`;
          return (
            <Fragment key={`nodes-${hub.key}`}>
              <button
                type="button"
                className={`cmap-node hub ${hub.key}${selectedId === hubId ? ' active' : ''}`}
                style={{ left: hub.x, top: hub.y }}
                onPointerDown={(e) => startNodeDrag(e, hubId, hub.x, hub.y)}
                onPointerMove={moveNodeDrag}
                onPointerUp={(e) => endNodeDrag(e, hubId)}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="cmap-hub-icon"><Icon size={14} /></span>
                <span className="cmap-hub-label">{meta.label}</span>
                <span className="cmap-hub-count">{hub.count}</span>
              </button>
              {hub.leaves.map((leaf) => (
                <button
                  type="button"
                  key={leaf.id}
                  className={`cmap-node leaf ${hub.key}${selectedId === leaf.id ? ' active' : ''}`}
                  style={{ left: leaf.x, top: leaf.y }}
                  onPointerDown={(e) => startNodeDrag(e, leaf.id, leaf.x, leaf.y)}
                  onPointerMove={moveNodeDrag}
                  onPointerUp={(e) => endNodeDrag(e, leaf.id)}
                  onClick={(e) => e.stopPropagation()}
                  title={leaf.label}
                >
                  {leaf.label}
                </button>
              ))}
            </Fragment>
          );
        })}
      </div>

      <div className="cmap-controls" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cmap-ctrl" onClick={() => zoomAt(1.2)} aria-label="Zoom in" title="Zoom in">
          <Plus size={16} />
        </button>
        <span className="cmap-zoom-val">{Math.round(tf.scale * 100)}%</span>
        <button type="button" className="cmap-ctrl" onClick={() => zoomAt(1 / 1.2)} aria-label="Zoom out" title="Zoom out">
          <Minus size={16} />
        </button>
        <span className="cmap-ctrl-sep" />
        <button type="button" className="cmap-ctrl" onClick={fit} aria-label="Fit to view" title="Fit to view">
          <Maximize2 size={15} />
        </button>
        <button type="button" className="cmap-ctrl" onClick={() => { setPos({}); recenter(); }} aria-label="Reset layout" title="Reset layout">
          <RotateCcw size={15} />
        </button>
      </div>

      <span className="cmap-hint">Drag a node to move it · Drag canvas to pan · Scroll to zoom</span>
    </div>
  );
}

function buildGraphLayout(model) {
  const hubs = model.groups;
  const N = Math.max(hubs.length, 1);
  const R1 = 196;
  const leafGap = 142;
  const startAngle = -Math.PI / 2;
  const sector = (2 * Math.PI) / N;

  const placed = hubs.map((hub, i) => {
    const angle = startAngle + i * sector;
    const hx = R1 * Math.cos(angle);
    const hy = R1 * Math.sin(angle);
    const m = hub.items.length;
    const fan = Math.min(sector * 0.84, Math.max(0, m - 1) * 0.3);
    const leaves = hub.items.map((item, k) => {
      const t = m <= 1 ? 0 : k / (m - 1) - 0.5;
      const la = angle + t * fan;
      const rad = R1 + leafGap + (k % 2) * 70;
      return { id: item.id, label: item.label, x: rad * Math.cos(la), y: rad * Math.sin(la) };
    });
    return {
      key: hub.key,
      label: hub.label,
      count: hub.count,
      verb: HUB_VERB[hub.key] || 'includes',
      x: hx,
      y: hy,
      leaves
    };
  });

  const pts = [{ x: 0, y: 0 }];
  placed.forEach((h) => {
    pts.push({ x: h.x, y: h.y });
    h.leaves.forEach((l) => pts.push({ x: l.x, y: l.y }));
  });

  const padX = 140;
  const padY = 74;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  pts.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  const offX = padX - minX;
  const offY = padY - minY;
  const shift = (p) => ({ x: p.x + offX, y: p.y + offY });

  return {
    width: Math.max((maxX - minX) + padX * 2, 680),
    height: Math.max((maxY - minY) + padY * 2, 480),
    center: shift({ x: 0, y: 0 }),
    hubs: placed.map((h) => ({
      ...h,
      ...shift(h),
      leaves: h.leaves.map((l) => ({ ...l, ...shift(l) }))
    }))
  };
}

function NodeDetail({ node, context, onSelect }) {
  if (!node) return null;

  if (node.kind === 'hub') {
    const meta = CATEGORY_META[node.type] || { label: node.label, icon: Layers3 };
    return (
      <div className="detail-card">
        <span className={`detail-tag ${node.type}`}>{meta.label}</span>
        <h3>{node.label}</h3>
        <p className="detail-summary">{node.count} {node.count === 1 ? 'item' : 'items'} extracted from your documents.</p>
        <ul className="detail-hub-list">
          {node.items.map((item) => (
            <li key={item.id}>
              <button type="button" className="detail-hub-item" onClick={() => onSelect?.(item.id)}>
                <span>{item.label}</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (node.kind === 'business') {
    const summary = context.summary?.plain_english_summary || context.businessSummary?.plain_english_summary || context.businessSummary || 'No summary generated yet.';
    return (
      <div className="detail-card">
        <span className="detail-tag business">Business</span>
        <h3>{node.label}</h3>
        <p className="detail-summary">{String(summary)}</p>
        <div className="detail-stats">
          <Metric label="Confidence" value={pct(context.confidence ?? context.overallConfidence)} />
          <Metric label="Departments" value={count(context.departments)} />
          <Metric label="Roles" value={count(context.roles)} />
          <Metric label="Risk score" value={pct(context.riskScore ?? context.overallRiskScore)} />
        </div>
        <p className="detail-hint">Click a branch or note in the map to drill in.</p>
      </div>
    );
  }

  return (
    <div className="detail-card">
      <span className={`detail-tag ${node.type}`}>{node.hubLabel || node.type}</span>
      <h3>{node.label}</h3>
      <DetailFields type={node.type} data={node.data} />
    </div>
  );
}

function DetailFields({ type, data }) {
  if (!data || typeof data !== 'object') {
    return <p className="detail-summary">{String(data || 'No additional detail.')}</p>;
  }

  const fieldMap = {
    workflow: [
      { key: 'trigger', label: 'Trigger' },
      { key: 'owner', label: 'Owner' },
      { key: 'steps', label: 'Steps', list: true },
      { key: 'required_documents', label: 'Required documents', list: true },
      { key: 'decision_points', label: 'Decision points', list: true }
    ],
    rule: [
      { key: 'condition', label: 'Condition' },
      { key: 'action', label: 'Action' },
      { key: 'risk_level', label: 'Risk level' }
    ],
    risk: [
      { key: 'severity', label: 'Severity' },
      { key: 'reason', label: 'Reason' },
      { key: 'affected_workflow', label: 'Affected workflow' },
      { key: 'recommendation', label: 'Recommendation' }
    ],
    department: [
      { key: 'functions', label: 'Functions', list: true }
    ],
    role: [
      { key: 'department', label: 'Department' },
      { key: 'responsibilities', label: 'Responsibilities', list: true }
    ]
  };

  const text = (value) => {
    if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
    if (value && typeof value === 'object') return formatItem(value);
    return value == null ? '' : String(value);
  };

  const curated = (fieldMap[type] || []).map((field) => {
    const raw = data[field.key];
    if (field.list) {
      const items = (Array.isArray(raw) ? raw : raw ? [raw] : []).map((v) => text(v.step || v)).filter(Boolean);
      return items.length ? { ...field, items } : null;
    }
    const value = text(raw).trim();
    return value ? { ...field, value } : null;
  }).filter(Boolean);

  // Surface any remaining extracted fields so clicking a node shows the full
  // detail, not just the curated subset above.
  const shownKeys = new Set((fieldMap[type] || []).map((f) => f.key));
  const skipKeys = new Set([
    ...shownKeys, 'id', 'name', 'label', 'kind', 'type', 'hubLabel',
    'rule_name', 'workflow_name', 'risk', 'role', 'department', 'title'
  ]);
  const humanize = (key) => key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());

  const extra = Object.keys(data)
    .filter((key) => !skipKeys.has(key) && data[key] != null && data[key] !== '')
    .map((key) => {
      const raw = data[key];
      if (Array.isArray(raw)) {
        const items = raw.map((v) => text(v)).filter(Boolean);
        return items.length ? { key, label: humanize(key), items } : null;
      }
      const value = text(raw).trim();
      return value ? { key, label: humanize(key), value } : null;
    })
    .filter(Boolean);

  const fields = [...curated, ...extra];

  if (!fields.length) return <p className="detail-summary">No additional detail extracted.</p>;

  return (
    <div className="detail-fields">
      {fields.map((field) => (
        <div className="detail-field" key={field.key}>
          <span className="detail-field-label">{field.label}</span>
          {field.items
            ? <ul className="detail-bullets">{field.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
            : <p>{field.value}</p>}
        </div>
      ))}
    </div>
  );
}

function buildKnowledgeModel(context) {
  const slug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  const textValue = (value) => {
    if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ');
    if (value && typeof value === 'object') return formatItem(value);
    return value == null ? '' : String(value);
  };
  const trim = (value, max = 88) => {
    const text = textValue(value).trim();
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  };

  const businessName = trim(context.summary?.business_name || context.orgName || 'Business', 48);

  const categories = [
    { key: 'department', label: 'Departments', raw: context.departments || [], getLabel: (item) => item.name || item.department || item },
    { key: 'role', label: 'Roles', raw: context.roles || [], getLabel: (item) => item.role || item.name || item },
    { key: 'workflow', label: 'Workflows', raw: context.workflows || [], getLabel: (item) => item.workflow_name || item.name || item },
    { key: 'rule', label: 'Rules', raw: context.rules || [], getLabel: (item) => item.rule_name || item.rule || item.condition || item },
    { key: 'risk', label: 'Risks', raw: context.risks || [], getLabel: (item) => item.risk || item.title || item }
  ]
    .map((cat) => ({
      ...cat,
      entries: cat.raw
        .map((item) => ({ label: textValue(cat.getLabel(item)).trim(), data: item }))
        .filter((entry) => entry.label)
    }))
    .filter((cat) => cat.entries.length);

  const nodeMap = new globalThis.Map();
  nodeMap.set('business', { id: 'business', label: businessName, type: 'business', kind: 'business' });

  const groups = categories.map((cat) => {
    const items = cat.entries.map((entry, j) => {
      const id = `${cat.key}-${slug(entry.label)}-${j}`;
      const label = trim(entry.label, 88);
      nodeMap.set(id, { id, label, type: cat.key, kind: 'leaf', data: entry.data, hubLabel: cat.label });
      return { id, label };
    });
    return { key: cat.key, label: cat.label, count: cat.entries.length, items };
  });

  groups.forEach((group) => {
    nodeMap.set(`hub-${group.key}`, {
      id: `hub-${group.key}`,
      label: group.label,
      type: group.key,
      kind: 'hub',
      count: group.count,
      items: group.items
    });
  });

  const stats = [
    { label: 'Confidence', value: pct(context.confidence ?? context.overallConfidence) },
    { label: 'Departments', value: count(context.departments) },
    { label: 'Roles', value: count(context.roles) },
    { label: 'Workflows', value: count(context.workflows) },
    { label: 'Rules', value: count(context.rules) },
    { label: 'Risks', value: count(context.risks) }
  ];

  return {
    business: { id: 'business', label: businessName, stats },
    groups,
    nodeMap
  };
}

// Decide what Lucy should "pull up" alongside an answer. Looks at what the
// person asked and, when it maps to real extracted data, returns a panel that
// gets shown inline — so it feels like a colleague opening the map or a file
// on screen, never an empty placeholder.
function buildAttachment(text, context) {
  if (!context) return null;
  let model;
  try {
    model = buildKnowledgeModel(context);
  } catch {
    return null;
  }
  if (!model) return null;

  const q = ` ${String(text || '').toLowerCase()} `;
  const has = (...words) => words.some((w) => q.includes(w));
  const groupFor = (key) => {
    const g = model.groups.find((grp) => grp.key === key);
    if (!g || !g.count) return null;
    return {
      kind: 'list',
      key: g.key,
      label: g.label,
      count: g.count,
      items: g.items.map((i) => i.label)
    };
  };

  if (has('overview', 'big picture', 'whole business', 'everything', 'structure',
    'how the business', 'how does the business', 'how the company', 'how does the company',
    'operating model', 'org chart', 'organi', ' map', 'snapshot', 'summary', 'summarise', 'summarize')) {
    return {
      kind: 'map',
      business: model.business,
      groups: model.groups.map((g) => ({ key: g.key, label: g.label, count: g.count }))
    };
  }
  if (has('risk', 'problem', 'bottleneck', 'issue', 'gap', 'weak', 'threat', 'vulnerab', 'fragile')) return groupFor('risk');
  if (has('rule', 'policy', 'policies', 'approval', 'compliance', 'spend', 'govern', 'sign-off', 'sign off')) return groupFor('rule');
  if (has('workflow', 'process', 'procedure', ' steps', 'operation', 'pipeline', 'handoff', 'hand-off', 'day to day', 'day-to-day')) return groupFor('workflow');
  if (has('role', ' who ', 'owner', 'owns', 'responsib', 'people', 'staff', 'position', 'team member', 'reports to', 'headcount')) return groupFor('role');
  if (has('department', ' team', 'division', 'function', ' unit')) return groupFor('department');
  return null;
}

function Validation({ validation, onReview }) {
  const stats = validation?.stats || {};
  const items = validation?.items || validation?.needsReview || [];
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ claim: '', sourceExcerpt: '' });

  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return item.status === 'needs_review' || item.status === 'uncertain';
    return item.status === filter;
  });

  function startEdit(item) {
    setEditing(item.id);
    setDraft({ claim: item.claim || '', sourceExcerpt: item.sourceExcerpt || '' });
  }
  function saveEdit(id) {
    onReview(id, 'edit', { claim: draft.claim, sourceExcerpt: draft.sourceExcerpt });
    setEditing(null);
  }

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'needs_review', label: 'Needs review' },
    { id: 'verified', label: 'Verified' },
    { id: 'rejected', label: 'Rejected' }
  ];

  return (
    <section className="view-grid">
      <div className="stats">
        <Metric label="Verified" value={stats.verified || 0} />
        <Metric label="Uncertain" value={stats.uncertain || 0} />
        <Metric label="Needs review" value={stats.needsReview || 0} />
        <Metric label="Average confidence" value={pct(stats.averageConfidence)} />
      </div>
      <div className="panel span-2">
        <PanelHeader icon={ShieldCheck} title={`Findings (${filtered.length})`} />
        <div className="filter-row">
          {filters.map((f) => (
            <button key={f.id} className={`chip ${filter === f.id ? 'chip-active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        {filtered.length ? filtered.map((item) => (
          <div className="review-card" key={item.id}>
            {editing === item.id ? (
              <div className="review-edit">
                <label className="ios-field"><span>Claim</span><textarea value={draft.claim} onChange={(e) => setDraft((d) => ({ ...d, claim: e.target.value }))} /></label>
                <label className="ios-field"><span>Source excerpt</span><textarea value={draft.sourceExcerpt} onChange={(e) => setDraft((d) => ({ ...d, sourceExcerpt: e.target.value }))} /></label>
                <div className="review-actions">
                  <button className="secondary" onClick={() => saveEdit(item.id)}><Check size={16} /> Save</button>
                  <button className="ghost-button" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="review-head">
                  <strong>{item.claim}</strong>
                  <span className="badges">
                    <StatusBadge status={item.status} />
                    {typeof item.confidence === 'number' && <span className="badge badge-muted">{pct(item.confidence)}</span>}
                    {item.source && <span className="badge badge-muted">{String(item.source).replaceAll('_', ' ')}</span>}
                  </span>
                </div>
                <p className="review-excerpt">{item.sourceExcerpt || 'No source excerpt.'}</p>
                {item.documentName && <p className="review-source"><FileText size={13} /> {item.documentName}</p>}
                <div className="review-actions">
                  <button className="secondary" onClick={() => onReview(item.id, 'confirm')}><Check size={16} /> Approve</button>
                  <button className="danger-button" onClick={() => onReview(item.id, 'reject')}><X size={16} /> Reject</button>
                  <button className="ghost-button" onClick={() => startEdit(item)}><Pencil size={15} /> Edit</button>
                </div>
              </>
            )}
          </div>
        )) : <EmptyInline message="No findings in this view." />}
      </div>
    </section>
  );
}

function StatusBadge({ status }) {
  const map = {
    verified: { label: 'Verified', cls: 'badge-ok' },
    rejected: { label: 'Rejected', cls: 'badge-bad' },
    needs_review: { label: 'Needs review', cls: 'badge-warn' },
    uncertain: { label: 'Uncertain', cls: 'badge-warn' }
  };
  const it = map[status] || { label: status || 'Unknown', cls: 'badge-muted' };
  return <span className={`badge ${it.cls}`}>{it.label}</span>;
}

const MODEL_TABS = [
  { id: 'map', label: 'Map' },
  { id: 'findings', label: 'Findings' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'issues', label: 'Issues' }
];

function OperatingModel({ tab, onTab, context, validation, onReview, workflows, onSaveWorkflow, onDeleteWorkflow, exceptions, onScanExceptions, onCreateException, onUpdateException }) {
  const active = MODEL_TABS.some((t) => t.id === tab) ? tab : 'map';
  const tabBar = (
    <div className="filter-row model-tabs" role="tablist" aria-label="Operating model sections">
      {MODEL_TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`chip ${active === t.id ? 'chip-active' : ''}`}
          onClick={() => onTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  if (active === 'map') {
    return <KnowledgeMap context={context} tabBar={tabBar} />;
  }

  return (
    <section className="ios-page">
      <header className="ios-page-head">
        <h2>Operating Model</h2>
        <p>What Orgni understood about your business — findings to verify, workflows, and issues to resolve.</p>
      </header>
      {tabBar}
      {active === 'findings' && <Validation validation={validation} onReview={onReview} />}
      {active === 'workflows' && <Workflows data={workflows} onSave={onSaveWorkflow} onDelete={onDeleteWorkflow} />}
      {active === 'issues' && <Exceptions data={exceptions} onScan={onScanExceptions} onCreate={onCreateException} onUpdate={onUpdateException} />}
    </section>
  );
}

function Home({ dashboard, onNavigate, onIntake, hasDocs }) {
  const c = dashboard?.counts || {};
  const activity = dashboard?.recentActivity || [];
  const cards = [
    { label: 'Sources', value: c.documents || 0, sub: c.failedDocuments ? `${c.failedDocuments} failed to read` : 'documents', icon: Database, view: 'documents' },
    { label: 'Findings to review', value: c.findingsNeedingReview || 0, sub: `${c.findingsVerified || 0} verified`, icon: ShieldCheck, view: 'findings' },
    { label: 'Workflows', value: c.workflowsSaved || 0, sub: `${c.workflowsApproved || 0} approved · ${c.workflowsDetected || 0} detected`, icon: Workflow, view: 'workflows' },
    { label: 'Open issues', value: c.exceptionsOpen || 0, sub: `${c.exceptionsTotal || 0} total`, icon: AlertTriangle, view: 'issues' },
    { label: 'Confidence', value: pct(c.confidence), sub: `${c.findingsTotal || 0} findings`, icon: Scale, view: 'findings' }
  ];
  const nextStep = (dashboard?.recommendedNextSteps || [])[0]
    || (!hasDocs ? 'Add your business documents so Orgni can build your operating model.' : null)
    || (c.findingsNeedingReview ? `Review ${c.findingsNeedingReview} finding(s) in your Operating Model.` : null)
    || (c.exceptionsOpen ? `Resolve ${c.exceptionsOpen} open issue(s) in your Operating Model.` : null);
  const nextStepTarget = !hasDocs ? 'documents' : (c.findingsNeedingReview ? 'findings' : (c.exceptionsOpen ? 'issues' : 'assistant'));
  return (
    <section className="ios-page">
      <header className="ios-page-head">
        <h2>Home</h2>
        <p>{summaryText(dashboard?.summary) || 'A live snapshot of your operating model — what Orgni knows, what needs review, and what to do next.'}</p>
      </header>

      {!hasDocs ? (
        <div className="panel callout">
          <strong>Start by adding sources.</strong>
          <span>Upload your business documents so Orgni can build your operating model.</span>
          <button className="primary" onClick={() => onNavigate('documents')}><UploadCloud size={16} /> Add sources</button>
        </div>
      ) : nextStep && (
        <div className="panel callout">
          <strong>Suggested next action</strong>
          <span>{nextStep}</span>
          <button className="primary" onClick={() => onNavigate(nextStepTarget)}><ArrowRight size={16} /> Take me there</button>
        </div>
      )}

      <div className="home-cards">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} className="home-card" onClick={() => onNavigate(card.view)}>
              <span className="home-card-icon"><Icon size={18} /></span>
              <strong className="home-card-value">{card.value}</strong>
              <span className="home-card-label">{card.label}</span>
              <span className="home-card-sub">{card.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="home-lower">
        <div className="panel">
          <PanelHeader icon={AlertTriangle} title="Needs your attention" />
          <List
            items={[
              c.findingsNeedingReview ? `${c.findingsNeedingReview} finding(s) need review` : null,
              c.exceptionsOpen ? `${c.exceptionsOpen} open issue(s)` : null,
              c.failedDocuments ? `${c.failedDocuments} document(s) failed to read` : null,
              ...(dashboard?.recommendedNextSteps || [])
            ]}
            fallback="Nothing needs attention right now."
          />
          {hasDocs && !dashboard?.summary && (
            <button className="primary" onClick={onIntake}><Brain size={16} /> Build knowledge map</button>
          )}
        </div>
        <div className="panel">
          <PanelHeader icon={ClipboardList} title="Recent activity" />
          {activity.length ? (
            <ul className="activity-list">
              {activity.map((a) => (
                <li key={a.id}>
                  <span className="activity-dot" aria-hidden="true" />
                  <span className="activity-text">{a.description}</span>
                  <span className="activity-time">{time(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyInline message="No activity yet." />}
        </div>
      </div>
    </section>
  );
}

const WF_STATUSES = ['draft', 'review_needed', 'approved'];

function Workflows({ data, onSave, onDelete }) {
  const saved = data?.workflows || [];
  const detected = data?.detected || [];
  const [editing, setEditing] = useState(null); // id | 'new' | null

  function exportJson(wf) {
    const blob = new Blob([JSON.stringify(wf, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(wf.name || 'workflow').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="view-grid">
      <div className="panel span-2">
        <div className="panel-head-row">
          <PanelHeader icon={Workflow} title={`Saved workflows (${saved.length})`} />
          <button className="secondary" onClick={() => setEditing('new')}><Plus size={16} /> New workflow</button>
        </div>
        {editing === 'new' && (
          <WorkflowEditor onCancel={() => setEditing(null)} onSave={(payload) => { onSave(payload); setEditing(null); }} />
        )}
        {saved.length ? saved.map((wf) => (
          editing === wf.id ? (
            <WorkflowEditor key={wf.id} workflow={wf} onCancel={() => setEditing(null)} onSave={(payload) => { onSave(payload, wf.id); setEditing(null); }} />
          ) : (
            <div className="wf-card" key={wf.id}>
              <div className="wf-card-head">
                <strong>{wf.name}</strong>
                <StatusBadge status={wf.status} />
              </div>
              {wf.description && <p className="wf-desc">{wf.description}</p>}
              {(wf.steps || []).length > 0 && (
                <ol className="wf-steps">{wf.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              )}
              <div className="review-actions">
                <button className="ghost-button" onClick={() => setEditing(wf.id)}><Pencil size={15} /> Edit</button>
                {wf.status !== 'approved' && <button className="secondary" onClick={() => onSave({ status: 'approved' }, wf.id)}><Check size={16} /> Approve</button>}
                {wf.status === 'approved' && <button className="ghost-button" onClick={() => onSave({ status: 'draft' }, wf.id)}><RotateCcw size={15} /> Reopen</button>}
                <button className="ghost-button" onClick={() => exportJson(wf)}><Download size={15} /> Export</button>
                <button className="danger-button" onClick={() => onDelete(wf.id)}><Trash2 size={15} /> Delete</button>
              </div>
            </div>
          )
        )) : (editing !== 'new' && <EmptyInline message="No saved workflows yet. Create one, or save a detected workflow below." />)}
      </div>

      <div className="panel span-2">
        <PanelHeader icon={Layers3} title={`Detected from your documents (${detected.length})`} />
        {detected.length ? detected.map((wf, i) => (
          <div className="wf-card wf-detected" key={i}>
            <div className="wf-card-head">
              <strong>{wf.name}</strong>
              <span className="badge badge-muted">detected</span>
            </div>
            {wf.description && <p className="wf-desc">{wf.description}</p>}
            {(wf.steps || []).length > 0 && (
              <ol className="wf-steps">{wf.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
            )}
            <div className="review-actions">
              <button className="secondary" onClick={() => onSave({ name: wf.name, description: wf.description, steps: wf.steps, trigger: wf.trigger, owner: wf.owner, source: 'detected', sourceDocumentName: wf.sourceDocumentName, confidence: wf.confidence })}><Plus size={16} /> Save to edit</button>
            </div>
          </div>
        )) : <EmptyInline message="No workflows detected yet. Add sources and build the knowledge map." />}
      </div>
    </section>
  );
}

function WorkflowEditor({ workflow, onCancel, onSave }) {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [stepsText, setStepsText] = useState((workflow?.steps || []).join('\n'));
  const [status, setStatus] = useState(workflow?.status || 'draft');

  function submit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      steps: stepsText.split('\n').map((s) => s.trim()).filter(Boolean),
      status
    });
  }

  return (
    <div className="wf-card wf-editor">
      <label className="ios-field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Invoice approval" autoFocus /></label>
      <label className="ios-field"><span>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this workflow is for" /></label>
      <label className="ios-field"><span>Steps (one per line)</span><textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)} placeholder={'Receive invoice\nManager approves\nFinance pays'} /></label>
      <label className="ios-field"><span>Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {WF_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <div className="review-actions">
        <button className="secondary" onClick={submit}><Check size={16} /> Save</button>
        <button className="ghost-button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

const EXCEPTION_TYPES = ['low_confidence', 'parse_failure', 'missing_document', 'conflicting_rule', 'approval_gap', 'unsupported_answer', 'other'];
const EXCEPTION_SEVERITIES = ['low', 'medium', 'high'];

function Exceptions({ data, onScan, onCreate, onUpdate }) {
  const list = data?.exceptions || [];
  const stats = data?.stats || {};
  const [filter, setFilter] = useState('open');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'other', severity: 'medium', detail: '' });

  const filtered = list.filter((e) => (filter === 'all' ? true : e.status === filter));

  function submit() {
    if (!form.title.trim()) return;
    onCreate({ ...form, title: form.title.trim(), detail: form.detail.trim() });
    setForm({ title: '', type: 'other', severity: 'medium', detail: '' });
    setAdding(false);
  }

  return (
    <section className="view-grid">
      <div className="stats">
        <Metric label="Open" value={stats.open || 0} />
        <Metric label="Resolved" value={stats.resolved || 0} />
        <Metric label="Total" value={stats.total || 0} />
      </div>
      <div className="panel span-2">
        <div className="panel-head-row">
          <PanelHeader icon={AlertTriangle} title={`Issues (${filtered.length})`} />
          <div className="head-actions">
            <button className="secondary" onClick={onScan}><RefreshCw size={15} /> Scan</button>
            <button className="secondary" onClick={() => setAdding((v) => !v)}><Plus size={16} /> Add</button>
          </div>
        </div>
        <div className="filter-row">
          {['open', 'resolved', 'all'].map((f) => (
            <button key={f} className={`chip ${filter === f ? 'chip-active' : ''}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        {adding && (
          <div className="wf-card wf-editor">
            <label className="ios-field"><span>Title</span><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="What needs attention" autoFocus /></label>
            <div className="ios-form-group">
              <label className="ios-field"><span>Type</span>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  {EXCEPTION_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
              <label className="ios-field"><span>Severity</span>
                <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                  {EXCEPTION_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label className="ios-field"><span>Detail</span><textarea value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} placeholder="Optional context" /></label>
            <div className="review-actions">
              <button className="secondary" onClick={submit}><Check size={16} /> Add issue</button>
              <button className="ghost-button" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        )}
        {filtered.length ? filtered.map((ex) => (
          <div className="ex-card" key={ex.id}>
            <div className="ex-head">
              <strong>{ex.title}</strong>
              <span className="badges">
                <SeverityBadge severity={ex.severity} />
                <span className="badge badge-muted">{String(ex.type).replaceAll('_', ' ')}</span>
                {ex.status === 'resolved' && <span className="badge badge-ok">resolved</span>}
              </span>
            </div>
            {ex.detail && <p className="ex-detail">{ex.detail}</p>}
            <div className="review-actions">
              {ex.status === 'open'
                ? <button className="secondary" onClick={() => onUpdate(ex.id, { status: 'resolved' })}><Check size={16} /> Resolve</button>
                : <button className="ghost-button" onClick={() => onUpdate(ex.id, { status: 'open' })}><RotateCcw size={15} /> Reopen</button>}
            </div>
          </div>
        )) : <EmptyInline message="No issues in this view. Run a scan to detect issues." />}
      </div>
    </section>
  );
}

function SeverityBadge({ severity }) {
  const cls = severity === 'high' ? 'badge-bad' : severity === 'medium' ? 'badge-warn' : 'badge-muted';
  return <span className={`badge ${cls}`}>{severity}</span>;
}

function Actions({ actionContext, setActionContext, result, onRun }) {
  return (
    <section className="view-grid">
      <div className="panel span-2">
        <PanelHeader icon={Bot} title="Generate action" />
        <textarea value={actionContext} onChange={(event) => setActionContext(event.target.value)} placeholder="Optional context for a team update or next step." />
        <div className="action-grid">
          {actionTypes.map((action) => {
            const Icon = action.icon;
            return <button key={action.type} className="action-tile" onClick={() => onRun(action.type)}><Icon size={18} /> {action.label}</button>;
          })}
        </div>
      </div>
      {result && (
        <div className="panel span-2">
          <PanelHeader icon={Sparkles} title={result.type.replaceAll('_', ' ')} />
          <pre>{result.result}</pre>
        </div>
      )}
    </section>
  );
}

function Profile({ profile, setProfile, onSave, currentOrg, onLogout }) {
  const update = (key) => (event) => setProfile((value) => ({ ...value, [key]: event.target.value }));
  const displayName = (profile.name || currentOrg?.name || 'Your business').trim();
  const initial = displayName.charAt(0).toUpperCase() || 'O';
  return (
    <section className="ios-page">
      <header className="ios-page-head">
        <h2>Profile</h2>
        <p>Manage your business identity and the details Orgni uses to understand how you operate.</p>
      </header>

      <div className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">{initial}</span>
        <div className="profile-hero-meta">
          <strong>{displayName}</strong>
          <span>{profile.businessType?.trim() || 'No business type set'}</span>
        </div>
        <button type="button" className="profile-logout" onClick={onLogout}>
          <LogOut size={16} /> Log out
        </button>
      </div>

      <form onSubmit={onSave}>
        <p className="ios-section-label">Business basics</p>
        <div className="ios-list-group ios-form-group">
          <label className="ios-field"><span>Company name</span><input value={profile.name} onChange={update('name')} placeholder="Your business" /></label>
          <label className="ios-field"><span>Business type</span><input value={profile.businessType} onChange={update('businessType')} placeholder="Logistics, retail, finance…" /></label>
        </div>

        <p className="ios-section-label">Operating model</p>
        <div className="ios-list-group ios-form-group">
          <label className="ios-field"><span>Departments</span><textarea value={profile.departmentsText} onChange={update('departmentsText')} placeholder="One per line" /></label>
          <label className="ios-field"><span>Key workflows</span><textarea value={profile.workflowsText} onChange={update('workflowsText')} placeholder="One per line" /></label>
          <label className="ios-field"><span>Current tools</span><textarea value={profile.toolsText} onChange={update('toolsText')} placeholder="One per line" /></label>
          <label className="ios-field"><span>Main problems</span><textarea value={profile.problemsText} onChange={update('problemsText')} placeholder="One per line" /></label>
        </div>

        <div className="ios-actions">
          <button className="primary"><Check size={16} /> Save profile</button>
        </div>
      </form>
    </section>
  );
}

function CreateOrgModal({ onClose, onSubmit }) {
  const [files, setFiles] = useState([]);
  const [name, setName] = useState('');
  const [dragging, setDragging] = useState(false);

  function addFiles(fileList) {
    const incoming = [...(fileList || [])];
    if (!incoming.length) return;
    setFiles((current) => {
      const seen = new Set(current.map((f) => `${f.name}:${f.size}`));
      return [...current, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  function removeFile(index) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer?.files);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!files.length) return;
    onSubmit({ files, name });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>Add your business</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p className="modal-intro">
          Upload any document about your business — a handbook, process notes, an org chart, anything. Orgni reads it and builds your operating model. No long forms.
        </p>

        <label
          className={`ios-dropzone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); if (!dragging) setDragging(true); }}
          onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
          onDrop={handleDrop}
        >
          <span className="ios-dropzone-icon"><UploadCloud size={26} /></span>
          <span className="ios-dropzone-text">
            <strong>{dragging ? 'Drop your document to upload' : 'Upload a document'}</strong>
            <span>Drag &amp; drop or click to browse · .txt, .md, .csv, .json, .pdf, .docx</span>
          </span>
          <input type="file" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
        </label>

        {files.length > 0 && (
          <div className="ios-list-group">
            {files.map((file, index) => (
              <div className="ios-cell ios-cell-doc" key={`${file.name}-${index}`}>
                <span className="ios-doc-icon"><FileText size={18} /></span>
                <span className="ios-cell-text">
                  <strong>{file.name}</strong>
                  <span>{formatBytes(file.size)}</span>
                </span>
                <button type="button" className="icon-btn danger" title="Remove" onClick={() => removeFile(index)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}

        <label className="modal-name-field">Business name <span className="modal-optional">(optional)</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="We'll use the document name if left blank" />
        </label>

        <button className="primary" disabled={!files.length}><Plus size={16} /> Create business</button>
      </form>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function PanelHeader({ icon: Icon, title }) {
  return <div className="panel-head"><Icon size={17} /><h2>{title}</h2></div>;
}

function List({ items, fallback }) {
  const clean = (items || []).filter(Boolean);
  if (!clean.length) return <EmptyInline message={fallback} />;
  return <ul className="clean-list">{clean.map((item, index) => <li key={`${formatItem(item)}-${index}`}>{formatItem(item)}</li>)}</ul>;
}

function formatItem(item) {
  if (item == null) return '';
  if (typeof item !== 'object') return String(item);
  return item.rule_name
    || item.rule
    || item.approval
    || item.exception
    || item.risk
    || item.gap
    || item.workflow_name
    || item.name
    || item.title
    || item.description
    || item.condition
    || JSON.stringify(item);
}

function EmptyInline({ message }) {
  return <p className="empty-inline">{message}</p>;
}

function EmptyState({ title, body, action }) {
  return (
    <div className="empty-state">
      <Brain size={34} />
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

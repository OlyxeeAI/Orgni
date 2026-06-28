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
  FileText,
  Globe,
  Layers3,
  Loader2,
  LogOut,
  Map,
  Maximize2,
  Minus,
  Plus,
  Plug,
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
  { id: 'documents', label: 'Sources', icon: Database },
  { id: 'map', label: 'Knowledge', icon: Map },
  { id: 'assistant', label: 'Assistant', icon: Sparkles },
  { id: 'plugins', label: 'Plugins', icon: Plug }
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
  const response = await fetch(path, {
    ...options,
    headers: isForm ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
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

export function App() {
  const [view, setView] = useState('documents');
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState('');
  const [docs, setDocs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [context, setContext] = useState(null);
  const [workflowContext, setWorkflowContext] = useState(null);
  const [financeContext, setFinanceContext] = useState(null);
  const [validation, setValidation] = useState(null);
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
      const [dash, docData, valData, histData] = await Promise.all([
        api(`/api/orgs/${nextOrgId}/dashboard`),
        api(`/api/orgs/${nextOrgId}/documents`),
        api(`/api/orgs/${nextOrgId}/engine/validation`).catch(() => null),
        api(`/api/orgs/${nextOrgId}/engine/history`).catch(() => ({ versions: [] }))
      ]);
      const hasKnowledgeMap = dash.knowledge?.status === 'ready' || Boolean(dash.summary);
      const ctxData = hasKnowledgeMap
        ? await api(`/api/orgs/${nextOrgId}/engine/context`).catch(() => ({ context: null }))
        : { context: null };
      setDashboard(dash);
      setDocs(docData.documents || []);
      setContext(ctxData.context || null);
      setValidation(valData);
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

  async function createOrg(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      name: form.get('name').trim(),
      businessType: form.get('businessType').trim(),
      departments: fromLines(form.get('departments') || ''),
      keyWorkflows: fromLines(form.get('keyWorkflows') || ''),
      currentTools: fromLines(form.get('currentTools') || ''),
      mainProblems: fromLines(form.get('mainProblems') || '')
    };
    setBusy('Creating business');
    try {
      const data = await api('/api/orgs', { method: 'POST', body: JSON.stringify(body) });
      setOrgs((items) => [...items, data.organization]);
      setOrgId(data.organization.id);
      setShowCreate(false);
      toast('Business created', 'success');
    } catch (error) {
      toast(error.message, 'danger');
    } finally {
      setBusy('');
    }
  }

  function logout() {
    window.location.href = '/';
  }

  async function sendChat(text) {
    const content = text.trim();
    if (!content || chatSending || !orgId) return;

    const history = [...chatMessages, { role: 'user', content }];
    setChatMessages(history);
    setChatSending(true);
    try {
      const data = await api(`/api/orgs/${orgId}/engine/chat`, {
        method: 'POST',
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) })
      });
      setChatMessages([
        ...history,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
          grounded: data.grounded,
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
      setView('map');
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

  async function reviewFinding(id, mode) {
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

  const content = !currentOrg ? (
    <EmptyState title="Create your business" body="Orgni needs one business profile before documents can be mapped." action={<button className="primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New business</button>} />
  ) : (
    <>
      {view === 'documents' && <Documents docs={docs} onUpload={uploadFiles} onDelete={deleteDocument} onIntake={runIntake} onConnect={(name) => toast(`${name} connections are coming soon — upload files for now.`, 'info')} />}
      {view === 'map' && <KnowledgeMap context={context} />}
      {view === 'assistant' && <Assistant org={currentOrg} context={context} messages={chatMessages} sending={chatSending} onSend={sendChat} onReset={() => setChatMessages([])} onSource={() => setView('documents')} onOpenMap={() => setView('map')} />}
      {view === 'validation' && <Validation validation={validation} onReview={reviewFinding} />}
      {view === 'actions' && <Actions actionContext={actionContext} setActionContext={setActionContext} result={actionResult} onRun={runAction} />}
      {view === 'plugins' && <PluginsCatalog onOpen={setView} />}
      {view === 'workflowPlugin' && <WorkflowPlugin context={workflowContext} onSource={() => setView('documents')} />}
      {view === 'financePlugin' && <FinancePlugin context={financeContext} onSource={() => setView('documents')} />}
      {view === 'profile' && <Profile profile={profile} setProfile={setProfile} onSave={saveProfile} currentOrg={currentOrg} onLogout={logout} />}
    </>
  );

  return (
    <div className="shell">
      <aside className="ios-rail" aria-label="Sidebar">
        <div className="ios-brand">
          <span className="ios-logo"><img src={orgniLogo} alt="Orgni logo" /></span>
          <span className="ios-brand-text">
            <strong>Orgni</strong>
            <small>Operating model</small>
          </span>
        </div>

        <nav className="ios-nav" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                className={`ios-item ${active ? 'active' : ''}`}
                onClick={() => setView(item.id)}
                aria-pressed={active}
              >
                <span className="ios-icon"><Icon size={17} /></span>
                <span className="ios-label">{item.label}</span>
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

      <main className={view === 'map' ? 'main--map' : ''}>
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

function Assistant({ org, context, messages, sending, onSend, onReset, onSource, onOpenMap }) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const ready = Boolean(context);
  const empty = messages.length === 0;

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
    onSend(draft);
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
      {!empty && (
        <header className="chat-head">
          <div className="chat-head-id">
            <span className="chat-avatar">{ASSISTANT_NAME.charAt(0)}</span>
            <h1>{ASSISTANT_NAME}</h1>
          </div>
          <button className="ghost chat-reset" onClick={onReset}><Plus size={15} /> New chat</button>
        </header>
      )}

      <div className={`chat-stream ${empty ? 'is-empty' : ''}`} ref={scrollRef}>
        {empty ? (
          <div className="chat-welcome">
            <span className="chat-welcome-orb">{ASSISTANT_NAME.charAt(0)}</span>
            <h2>{ready ? `Hi, I'm ${ASSISTANT_NAME}.` : `Hi, I'm ${ASSISTANT_NAME} — let's get me up to speed.`}</h2>
            <p>
              {ready
                ? `I know ${org?.name || 'this business'} inside out. Ask me about your people, workflows, rules or risks — and I'll pull up the map and the details right here as we talk.`
                : `I learn how your business runs from your own documents. Add a few sources and build the map, then I can walk you through everything.`}
            </p>
            {ready ? (
              <div className="chat-starters">
                {assistantStarters.map((s) => (
                  <button key={s} className="chat-starter" onClick={() => onSend(s)}>
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
                  {isAssistant && <span className="chat-bubble-avatar">{ASSISTANT_NAME.charAt(0)}</span>}
                  <div className="chat-bubble-col">
                    <div className={`chat-bubble ${msg.role} ${msg.error ? 'error' : ''}`}>
                      {isAssistant ? formatAssistant(shown, typingThis) : <p>{msg.content}</p>}
                      {isAssistant && !typingThis && msg.sources?.length > 0 && (
                        <div className="chat-sources">
                          {msg.sources.map((src) => (
                            <span key={src.id} className="chat-source-chip"><FileText size={12} /> {src.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isAssistant && !typingThis && msg.attachment && (
                      <AssistantAttachment attachment={msg.attachment} onOpenMap={onOpenMap} />
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="chat-row assistant">
                <span className="chat-bubble-avatar">{ASSISTANT_NAME.charAt(0)}</span>
                <div className="chat-bubble assistant">
                  <span className="chat-typing"><i /><i /><i /></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form className="chat-composer" onSubmit={submit}>
        <textarea
          rows={1}
          value={draft}
          placeholder={ready ? 'Ask about your business…' : 'Add sources to start chatting…'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!ready || sending}
        />
        <button type="submit" className="chat-send" disabled={!ready || sending || !draft.trim()} aria-label="Send">
          {sending ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
        </button>
      </form>
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
  const brand = color || `#${iconData?.hex || 'f26a1b'}`;
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

function Documents({ docs, onUpload, onDelete, onIntake, onConnect }) {
  return (
    <section className="ios-page">
      <header className="ios-page-head">
        <h2>Sources</h2>
        <p>Give Orgni something to learn from — upload your files, or connect a tool where your knowledge already lives.</p>
      </header>

      <label className="ios-dropzone">
        <span className="ios-dropzone-icon"><UploadCloud size={26} /></span>
        <span className="ios-dropzone-text">
          <strong>Upload files</strong>
          <span>.txt, .md, .csv, .json, .pdf, .docx</span>
        </span>
        <input type="file" multiple onChange={(event) => onUpload(event.target.files)} />
      </label>

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

      <p className="ios-section-label">Your sources{docs.length ? ` · ${docs.length}` : ''}</p>
      {docs.length ? (
        <div className="ios-list-group">
          {docs.map((doc) => (
            <div className="ios-cell ios-cell-doc" key={doc.id}>
              <span className="ios-doc-icon"><FileText size={18} /></span>
              <span className="ios-cell-text">
                <strong>{doc.name}</strong>
                <span>{doc.fileType} · {Math.round((doc.fileSize || 0) / 1024)} KB · {doc.wordCount || 0} words</span>
                {doc.parseError && <em>{doc.parseError}</em>}
              </span>
              <span className={`pill ${doc.status}`}>{doc.status}</span>
              <button className="icon-btn danger" title="Remove source" onClick={() => onDelete(doc.id)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="ios-list-group ios-empty">
          <EmptyInline message="No sources added yet — upload a file or connect a tool above." />
        </div>
      )}

      <div className="ios-actions">
        <button className="primary" onClick={onIntake} disabled={!docs.length}><Sparkles size={16} /> Build map</button>
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

function KnowledgeMap({ context }) {
  const model = useMemo(() => (context ? buildKnowledgeModel(context) : null), [context]);
  const [selectedId, setSelectedId] = useState('business');

  useEffect(() => { setSelectedId('business'); }, [context]);

  if (!context || !model) {
    return <EmptyState title="No knowledge map yet" body="Upload source documents, then build the Knowledge Map." />;
  }

  const selected = model.nodeMap.get(selectedId) || model.nodeMap.get('business');

  return (
    <section className="km-view">
      <header className="km-view-head">
        <span className="km-view-icon"><Map size={20} /></span>
        <div className="km-view-heading">
          <h2>Knowledge map</h2>
          <p>A living map of how {model.business.label} runs — departments, roles, workflows, rules and risks, all extracted from your documents.</p>
        </div>
      </header>

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
  const needsReview = validation?.needsReview || [];
  return (
    <section className="view-grid">
      <div className="stats">
        <Metric label="Verified" value={stats.verified || 0} />
        <Metric label="Uncertain" value={stats.uncertain || 0} />
        <Metric label="Needs review" value={stats.needsReview || 0} />
        <Metric label="Average confidence" value={pct(stats.averageConfidence)} />
      </div>
      <div className="panel span-2">
        <PanelHeader icon={ShieldCheck} title={`Review queue (${needsReview.length})`} />
        {needsReview.length ? needsReview.map((item) => (
          <div className="review-row" key={item.id}>
            <div>
              <strong>{item.claim}</strong>
              <span>{item.sourceExcerpt || 'No source excerpt.'}</span>
            </div>
            <button className="secondary" onClick={() => onReview(item.id, 'confirm')}><Check size={16} /> Confirm</button>
            <button className="danger-button" onClick={() => onReview(item.id, 'reject')}><X size={16} /> Reject</button>
          </div>
        )) : <EmptyInline message="No findings need review." />}
      </div>
    </section>
  );
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
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <h2>New business</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <label>Company name<input name="name" required minLength={2} autoFocus /></label>
        <label>Business type<input name="businessType" required minLength={2} placeholder="Logistics, retail, finance..." /></label>
        <label>Departments<textarea name="departments" placeholder="One per line" /></label>
        <label>Key workflows<textarea name="keyWorkflows" placeholder="One per line" /></label>
        <label>Current tools<textarea name="currentTools" placeholder="One per line" /></label>
        <label>Main problems<textarea name="mainProblems" placeholder="One per line" /></label>
        <button className="primary"><Plus size={16} /> Create business</button>
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

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  Building2,
  Check,
  ClipboardList,
  Database,
  FileText,
  Globe,
  Layers3,
  Loader2,
  Map,
  Plus,
  Plug,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  siAirtable,
  siAsana,
  siClickup,
  siGmail,
  siGooglecalendar,
  siGoogledrive,
  siHubspot,
  siJira,
  siMake,
  siNotion,
  siQuickbooks,
  siTrello,
  siXero,
  siZapier
} from 'simple-icons';
import orgniLogo from './assets/orgni-logo.png';
import orgniWorkflowLogo from './assets/orgni-workflow.png';
import orgniFinanceLogo from './assets/orgni-finance.png';
import logoOpenai from './assets/logos/openai.svg';
import logoCopilot from './assets/logos/microsoft-copilot.svg';
import logoSlack from './assets/logos/slack.svg';
import logoTeams from './assets/logos/microsoft-teams.svg';
import logoSalesforce from './assets/logos/salesforce.svg';

const navItems = [
  { id: 'documents', label: 'Sources', icon: Database },
  { id: 'map', label: 'Knowledge', icon: Map },
  { id: 'plugins', label: 'Plugins', icon: Plug }
];

const connectSources = [
  { name: 'Google Drive', iconData: siGoogledrive, detail: 'Sync folders & files' },
  { name: 'Notion', iconData: siNotion, detail: 'Import internal docs' },
  { name: 'Gmail', iconData: siGmail, detail: 'Learn from email' },
  { name: 'HubSpot', iconData: siHubspot, detail: 'Connect CRM records' },
  { name: 'Airtable', iconData: siAirtable, detail: 'Map structured data' },
  { name: 'Website / URL', glyphIcon: Globe, color: '#0d9488', detail: 'Crawl a public page' }
];

const pluginItems = [
  { id: 'workflowPlugin', label: 'Workflow', image: orgniWorkflowLogo },
  { id: 'financePlugin', label: 'Finance', image: orgniFinanceLogo }
];

const externalPlugins = [
  { name: 'ChatGPT', category: 'AI assistant', image: logoOpenai, use: 'Ground answers, actions, and planning in company documents.' },
  { name: 'Microsoft Copilot', category: 'AI assistant', image: logoCopilot, use: 'Bring Orgni context into Microsoft 365 work.' },
  { name: 'Slack', category: 'Team chat', image: logoSlack, use: 'Answer operational questions inside channels.' },
  { name: 'Microsoft Teams', category: 'Team chat', image: logoTeams, use: 'Give teams shared business context during work.' },
  { name: 'Google Drive', category: 'Files', icon: siGoogledrive, use: 'Use Drive folders as business knowledge sources.' },
  { name: 'Gmail', category: 'Email', icon: siGmail, use: 'Draft replies and classify requests with business context.' },
  { name: 'Google Calendar', category: 'Calendar', icon: siGooglecalendar, use: 'Connect meetings to workflows, owners, and next steps.' },
  { name: 'Notion', category: 'Docs', icon: siNotion, use: 'Keep internal docs synced with Orgni knowledge.' },
  { name: 'HubSpot', category: 'CRM', icon: siHubspot, use: 'Make customer workflows aware of internal rules.' },
  { name: 'Salesforce', category: 'CRM', image: logoSalesforce, use: 'Give sales and service teams approved context.' },
  { name: 'QuickBooks', category: 'Finance', icon: siQuickbooks, use: 'Connect finance rules, approvals, and exceptions.' },
  { name: 'Xero', category: 'Finance', icon: siXero, use: 'Support finance controls with operational context.' },
  { name: 'Zapier', category: 'Automation', icon: siZapier, use: 'Trigger workflows from trusted business context.' },
  { name: 'Make', category: 'Automation', icon: siMake, use: 'Build automations around extracted roles and rules.' },
  { name: 'Asana', category: 'Work management', icon: siAsana, use: 'Turn gaps and next steps into trackable work.' },
  { name: 'Jira', category: 'Work management', icon: siJira, use: 'Route operational findings into delivery queues.' },
  { name: 'Trello', category: 'Work management', icon: siTrello, use: 'Create boards from workflows, risks, and actions.' },
  { name: 'Airtable', category: 'Database', icon: siAirtable, use: 'Map structured operations data to business memory.' },
  { name: 'ClickUp', category: 'Work management', icon: siClickup, use: 'Push Orgni tasks into team execution spaces.' }
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

  const currentOrg = useMemo(() => orgs.find((org) => org.id === orgId), [orgs, orgId]);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    refreshOrgData(orgId);
  }, [orgId]);

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
      {view === 'validation' && <Validation validation={validation} onReview={reviewFinding} />}
      {view === 'actions' && <Actions actionContext={actionContext} setActionContext={setActionContext} result={actionResult} onRun={runAction} />}
      {view === 'plugins' && <PluginsCatalog onOpen={setView} />}
      {view === 'workflowPlugin' && <WorkflowPlugin context={workflowContext} onSource={() => setView('documents')} />}
      {view === 'financePlugin' && <FinancePlugin context={financeContext} onSource={() => setView('documents')} />}
      {view === 'profile' && <Profile profile={profile} setProfile={setProfile} onSave={saveProfile} />}
    </>
  );

  return (
    <div className="shell">
      <aside className="workspace-chrome" aria-label="Sidebar">
        <div className="chrome-brand">
          <span className="mark"><img src={orgniLogo} alt="Orgni logo" /></span>
          <strong>Orgni</strong>
        </div>

        <div className="chrome-business">
          <span>{currentOrg?.businessType || 'Business'}</span>
          <strong>{currentOrg?.name || 'Set up business'}</strong>
        </div>

        <nav className="chrome-nav" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <p className="chrome-section-label">Plugins</p>
        <nav className="chrome-plugins" aria-label="Plugins">
          {pluginItems.map((item) => (
            <button key={item.id} className={view === item.id ? 'active plugin-active' : 'plugin-link'} onClick={() => setView(item.id)}>
              <img className="plugin-logo" src={item.image} alt="" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className={`profile-link sidebar-profile ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
          <Building2 size={16} />
          Profile
        </button>
      </aside>

      <main>
        {content}
      </main>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onSubmit={createOrg} locked={!orgs.length} />}
      {notice && <div className={`toast ${notice.tone}`}>{notice.message}</div>}
      {busy && <div className="busy"><Loader2 size={20} /> {busy}</div>}
    </div>
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
            <div className="integration-card" key={plugin.name}>
              <BrandGlyph image={plugin.image} iconData={plugin.icon} mark={plugin.mark} color={plugin.color} />
              <div>
                <strong>{plugin.name}</strong>
                <span>{plugin.category}</span>
              </div>
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
    <section className="view-grid">
      <div className="panel span-2">
        <PanelHeader icon={Database} title="Add a knowledge source" />
        <p className="lead">Give Orgni something to learn from — upload your files, or connect a tool where your knowledge already lives.</p>

        <div className="source-options">
          <label className="dropzone">
            <UploadCloud size={28} />
            <strong>Upload files</strong>
            <span>.txt, .md, .csv, .json, .pdf, .docx</span>
            <input type="file" multiple onChange={(event) => onUpload(event.target.files)} />
          </label>

          <div className="source-connect">
            <p className="source-connect-title">Or connect a source</p>
            <div className="source-grid">
              {connectSources.map((src) => (
                <button type="button" className="source-card" key={src.name} onClick={() => onConnect(src.name)}>
                  <BrandGlyph icon={src.glyphIcon} iconData={src.iconData} color={src.color} />
                  <span className="source-text">
                    <strong>{src.name}</strong>
                    <span>{src.detail}</span>
                  </span>
                  <span className="source-soon">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel span-2">
        <PanelHeader icon={FileText} title={`Your sources (${docs.length})`} />
        <div className="doc-list">
          {docs.length ? docs.map((doc) => (
            <div className="doc-row" key={doc.id}>
              <FileText size={18} />
              <div>
                <strong>{doc.name}</strong>
                <span>{doc.fileType} · {Math.round((doc.fileSize || 0) / 1024)} KB · {doc.wordCount || 0} words</span>
                {doc.parseError && <em>{doc.parseError}</em>}
              </div>
              <span className={`pill ${doc.status}`}>{doc.status}</span>
              <button className="icon-btn danger" title="Remove source" onClick={() => onDelete(doc.id)}><Trash2 size={16} /></button>
            </div>
          )) : <EmptyInline message="No sources added yet — upload a file or connect a tool above." />}
        </div>
        <div className="inline-actions">
          <button className="primary" onClick={onIntake} disabled={!docs.length}><Sparkles size={16} /> Build map</button>
        </div>
      </div>
    </section>
  );
}

function KnowledgeMap({ context }) {
  const network = useMemo(
    () => (context ? buildKnowledgeNetwork(context) : { nodes: [], edges: [], nodeMap: new globalThis.Map(), legend: [] }),
    [context]
  );
  const [selectedId, setSelectedId] = useState('business');

  useEffect(() => { setSelectedId('business'); }, [context]);

  if (!context || !network.nodes.length) {
    return <EmptyState title="No knowledge map yet" body="Upload source documents, then build the Knowledge Map." />;
  }

  const selected = network.nodeMap.get(selectedId) || network.nodeMap.get('business');

  return (
    <section className="view-grid">
      <div className="panel span-2 km-layout">
        <div className="km-network">
          <PanelHeader icon={Map} title="Knowledge network" />
          <p className="network-hint">Your business sits at the centre. Click any node to see its details.</p>
          <KnowledgeNetwork network={network} selectedId={selected?.id} onSelect={setSelectedId} />
          {network.legend.length > 0 && (
            <div className="network-legend">
              {network.legend.map((item) => <span key={item.type} className={item.type}><i className="dot" />{item.label}</span>)}
            </div>
          )}
        </div>
        <aside className="km-detail">
          <NodeDetail node={selected} context={context} onSelect={setSelectedId} />
        </aside>
      </div>
    </section>
  );
}

function NodeDetail({ node, context, onSelect }) {
  if (!node) return null;

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

  if (node.kind === 'hub') {
    return (
      <div className="detail-card">
        <span className={`detail-tag ${node.type}`}>{node.label}</span>
        <h3>{node.label}</h3>
        <p className="detail-summary">{node.count} {node.count === 1 ? 'item' : 'items'} in this branch.</p>
        <ul className="detail-list">
          {(node.items || []).map((entry) => (
            <li key={entry.id}>
              <button className="detail-jump" onClick={() => onSelect(entry.id)}>{entry.label}</button>
            </li>
          ))}
        </ul>
        {node.count > (node.items || []).length && (
          <p className="detail-hint">Showing {(node.items || []).length} of {node.count}.</p>
        )}
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

  const fields = (fieldMap[type] || []).map((field) => {
    const raw = data[field.key];
    if (field.list) {
      const items = (Array.isArray(raw) ? raw : raw ? [raw] : []).map((v) => text(v.step || v)).filter(Boolean);
      return items.length ? { ...field, items } : null;
    }
    const value = text(raw).trim();
    return value ? { ...field, value } : null;
  }).filter(Boolean);

  if (!fields.length) return <p className="detail-summary">No additional detail extracted.</p>;

  return (
    <div className="detail-fields">
      {fields.map((field) => (
        <div className="detail-field" key={field.key}>
          <span className="detail-field-label">{field.label}</span>
          {field.list
            ? <ul className="detail-bullets">{field.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
            : <p>{field.value}</p>}
        </div>
      ))}
    </div>
  );
}

function KnowledgeNetwork({ network, selectedId, onSelect }) {
  if (!network.nodes.length) return null;
  return (
    <div className="network-wrap" aria-label="Knowledge map network">
      <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {network.edges.map((edge) => {
          const from = network.nodeMap.get(edge.from);
          const to = network.nodeMap.get(edge.to);
          if (!from || !to) return null;
          const active = selectedId && (edge.from === selectedId || edge.to === selectedId);
          return <line key={`${edge.from}-${edge.to}`} className={`edge ${edge.kind} ${edge.type || ''} ${active ? 'active' : ''}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
      </svg>
      {network.nodes.map((node) => (
        <button
          type="button"
          className={`network-node ${node.kind} ${node.type} ${node.id === selectedId ? 'selected' : ''}`}
          key={node.id}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          title={node.label}
          onClick={() => onSelect(node.id)}
        >
          {node.kind !== 'leaf' && <span className="node-dot" aria-hidden="true" />}
          <strong>{node.label}</strong>
          {node.count != null && <em>{node.count} {node.count === 1 ? 'item' : 'items'}</em>}
        </button>
      ))}
    </div>
  );
}

function buildKnowledgeNetwork(context) {
  const slug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  const textValue = (value) => {
    if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ');
    if (value && typeof value === 'object') return formatItem(value);
    return value == null ? '' : String(value);
  };
  const trim = (value, max = 64) => {
    const text = textValue(value).trim();
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  };

  const businessName = trim(context.summary?.business_name || context.orgName || 'Business', 40);

  const categories = [
    { key: 'workflow', label: 'Workflows', raw: context.workflows || [], getLabel: (item) => item.workflow_name || item.name || item },
    { key: 'role', label: 'Roles', raw: context.roles || [], getLabel: (item) => item.role || item.name || item },
    { key: 'department', label: 'Departments', raw: context.departments || [], getLabel: (item) => item.name || item.department || item },
    { key: 'rule', label: 'Rules', raw: context.rules || [], getLabel: (item) => item.rule_name || item.rule || item.condition || item },
    { key: 'risk', label: 'Risks', raw: context.risks || [], getLabel: (item) => item.risk || item.title || item }
  ]
    .map((cat) => ({
      ...cat,
      entries: cat.raw
        .map((item) => ({ label: textValue(cat.getLabel(item)), data: item }))
        .filter((entry) => entry.label)
    }))
    .filter((cat) => cat.entries.length);

  const nodes = [];
  const edges = [];
  const cx = 50;
  const cy = 50;
  nodes.push({ id: 'business', label: businessName, type: 'business', kind: 'business', x: cx, y: cy });

  const hubRx = 21;
  const hubRy = 27;
  const leafRx = 41;
  const leafRy = 44;
  const n = categories.length || 1;

  categories.forEach((cat, i) => {
    const angle = (-Math.PI / 2) + (i / n) * Math.PI * 2;
    const hx = cx + hubRx * Math.cos(angle);
    const hy = cy + hubRy * Math.sin(angle);
    const hubId = `hub-${cat.key}`;
    const visible = cat.entries.slice(0, 5);
    const visibleNodes = visible.map((entry, j) => ({ id: `${cat.key}-leaf-${slug(entry.label)}-${j}`, label: trim(entry.label, 48), entry }));
    nodes.push({ id: hubId, label: cat.label, count: cat.entries.length, type: cat.key, kind: 'hub', x: hx, y: hy, items: visibleNodes.map((v) => ({ id: v.id, label: v.label })) });
    edges.push({ from: 'business', to: hubId, kind: 'trunk', type: cat.key });

    const k = visibleNodes.length;
    const spread = k <= 1 ? 0 : Math.min(Math.PI * 0.55, 0.34 * (k - 1));
    visibleNodes.forEach((v, j) => {
      const t = k === 1 ? 0 : (j / (k - 1)) - 0.5;
      const childAngle = angle + t * spread;
      const lx = cx + leafRx * Math.cos(childAngle);
      const ly = cy + leafRy * Math.sin(childAngle);
      nodes.push({ id: v.id, label: v.label, type: cat.key, kind: 'leaf', x: lx, y: ly, data: v.entry.data, hubLabel: cat.label });
      edges.push({ from: hubId, to: v.id, kind: 'branch', type: cat.key });
    });
  });

  return {
    nodes,
    edges,
    nodeMap: new globalThis.Map(nodes.map((node) => [node.id, node])),
    legend: categories.map((cat) => ({ type: cat.key, label: cat.label }))
  };
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

function Profile({ profile, setProfile, onSave }) {
  const update = (key) => (event) => setProfile((value) => ({ ...value, [key]: event.target.value }));
  return (
    <form className="panel form-panel" onSubmit={onSave}>
      <PanelHeader icon={Building2} title="Business profile" />
      <label>Company name<input value={profile.name} onChange={update('name')} /></label>
      <label>Business type<input value={profile.businessType} onChange={update('businessType')} /></label>
      <label>Departments<textarea value={profile.departmentsText} onChange={update('departmentsText')} /></label>
      <label>Key workflows<textarea value={profile.workflowsText} onChange={update('workflowsText')} /></label>
      <label>Current tools<textarea value={profile.toolsText} onChange={update('toolsText')} /></label>
      <label>Main problems<textarea value={profile.problemsText} onChange={update('problemsText')} /></label>
      <button className="primary"><Check size={16} /> Save profile</button>
    </form>
  );
}

function CreateOrgModal({ onClose, onSubmit, locked }) {
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <h2>New business</h2>
          {!locked && <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>}
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

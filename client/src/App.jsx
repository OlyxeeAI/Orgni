import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  History,
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

const navItems = [
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'map', label: 'Knowledge', icon: Map },
  { id: 'plugins', label: 'Plugins', icon: Plug }
];

const pluginItems = [
  { id: 'workflowPlugin', label: 'Workflow', image: orgniWorkflowLogo },
  { id: 'financePlugin', label: 'Finance', image: orgniFinanceLogo }
];

const externalPlugins = [
  { name: 'ChatGPT', category: 'AI assistant', mark: 'GPT', color: '#10a37f', use: 'Ground answers, actions, and planning in company documents.' },
  { name: 'Microsoft Copilot', category: 'AI assistant', mark: 'Co', color: '#2563eb', use: 'Bring Orgni context into Microsoft 365 work.' },
  { name: 'Slack', category: 'Team chat', mark: 'S', color: '#4a154b', use: 'Answer operational questions inside channels.' },
  { name: 'Microsoft Teams', category: 'Team chat', mark: 'T', color: '#6264a7', use: 'Give teams shared business context during work.' },
  { name: 'Google Drive', category: 'Files', icon: siGoogledrive, use: 'Use Drive folders as business knowledge sources.' },
  { name: 'Gmail', category: 'Email', icon: siGmail, use: 'Draft replies and classify requests with business context.' },
  { name: 'Google Calendar', category: 'Calendar', icon: siGooglecalendar, use: 'Connect meetings to workflows, owners, and next steps.' },
  { name: 'Notion', category: 'Docs', icon: siNotion, use: 'Keep internal docs synced with Orgni knowledge.' },
  { name: 'HubSpot', category: 'CRM', icon: siHubspot, use: 'Make customer workflows aware of internal rules.' },
  { name: 'Salesforce', category: 'CRM', mark: 'SF', color: '#00a1e0', use: 'Give sales and service teams approved context.' },
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
  const [expandedWorkflow, setExpandedWorkflow] = useState('');

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
      {view === 'documents' && <Documents docs={docs} onUpload={uploadFiles} onDelete={deleteDocument} onIntake={runIntake} />}
      {view === 'map' && <KnowledgeMap context={context} history={history} expandedWorkflow={expandedWorkflow} setExpandedWorkflow={setExpandedWorkflow} />}
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
      <header className="workspace-chrome">
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

        <nav className="chrome-plugins" aria-label="Plugins">
          {pluginItems.map((item) => (
            <button key={item.id} className={view === item.id ? 'active plugin-active' : 'plugin-link'} onClick={() => setView(item.id)}>
              <img className="plugin-logo" src={item.image} alt="" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className={`profile-link ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
          <Building2 size={16} />
          Profile
        </button>
      </header>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">{currentOrg?.businessType || 'Business intelligence'}</p>
            <h1>{currentOrg?.name || 'Orgni'}</h1>
          </div>
        </header>
        {content}
      </main>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onSubmit={createOrg} locked={!orgs.length} />}
      {notice && <div className={`toast ${notice.tone}`}>{notice.message}</div>}
      {busy && <div className="busy"><Loader2 size={20} /> {busy}</div>}
    </div>
  );
}

function WorkflowPlugin({ context, onSource }) {
  if (!context) return <PluginEmpty title="Workflow plugin" body="Workflow needs a knowledge map before it can show business process context." onSource={onSource} />;
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
      <div className="stats">
        <Metric label="Workflows" value={count(context.workflows)} />
        <Metric label="Roles" value={count(context.roles)} />
        <Metric label="Dependencies" value={count(context.dependencies)} />
        <Metric label="Bottlenecks" value={count(context.bottlenecks)} />
      </div>
      <div className="panel span-2">
        <PanelHeader icon={Layers3} title="Workflow context" />
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
    </section>
  );
}

function FinancePlugin({ context, onSource }) {
  if (!context) return <PluginEmpty title="Finance plugin" body="Finance needs a knowledge map before it can show rules, approvals, exceptions, and risk context." onSource={onSource} />;
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
      <div className="stats">
        <Metric label="Rules" value={count(context.rules)} />
        <Metric label="Approvals" value={count(context.approvals)} />
        <Metric label="Exceptions" value={count(context.exceptions)} />
        <Metric label="Risks" value={count(context.risks)} />
      </div>
      <div className="panel">
        <PanelHeader icon={Check} title="Rules" />
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
    </section>
  );
}

function PluginEmpty({ title, body, onSource }) {
  return (
    <EmptyState
      title={title}
      body={body}
      action={<button className="primary" onClick={onSource}><UploadCloud size={16} /> Add documents</button>}
    />
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
              <BrandGlyph iconData={plugin.icon} mark={plugin.mark} color={plugin.color} />
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

function Documents({ docs, onUpload, onDelete, onIntake }) {
  return (
    <section className="view-grid">
      <div className="panel span-2">
        <PanelHeader icon={UploadCloud} title="Upload documents" />
        <label className="dropzone">
          <UploadCloud size={28} />
          <strong>Drop or choose files</strong>
          <span>.txt, .md, .csv, .json, .pdf, .docx</span>
          <input type="file" multiple onChange={(event) => onUpload(event.target.files)} />
        </label>
      </div>

      <div className="panel span-2">
        <PanelHeader icon={FileText} title={`Documents (${docs.length})`} />
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
              <button className="icon-btn danger" title="Delete document" onClick={() => onDelete(doc.id)}><Trash2 size={16} /></button>
            </div>
          )) : <EmptyInline message="No documents uploaded." />}
        </div>
        <div className="inline-actions">
          <button className="primary" onClick={onIntake} disabled={!docs.length}><Sparkles size={16} /> Build map</button>
        </div>
      </div>
    </section>
  );
}

function KnowledgeMap({ context, history, expandedWorkflow, setExpandedWorkflow }) {
  if (!context) return <EmptyState title="No knowledge map yet" body="Upload source documents, then build the Knowledge Map." />;
  const workflows = context.workflows || [];
  const summary = context.summary?.plain_english_summary || context.businessSummary?.plain_english_summary || context.businessSummary || 'No summary generated.';
  return (
    <section className="view-grid">
      <div className="panel span-2">
        <PanelHeader icon={Map} title="Business summary" />
        <p className="lead">{String(summary)}</p>
      </div>

      <KnowledgeNetwork context={context} />

      <div className="stats">
        <Metric label="Confidence" value={pct(context.confidence ?? context.overallConfidence)} />
        <Metric label="Departments" value={count(context.departments)} />
        <Metric label="Roles" value={count(context.roles)} />
        <Metric label="Risk score" value={pct(context.riskScore ?? context.overallRiskScore)} />
      </div>

      <div className="panel span-2">
        <PanelHeader icon={Layers3} title="Workflows" />
        {workflows.length ? workflows.map((workflow, index) => {
          const id = workflow.workflow_name || workflow.name || `Workflow ${index + 1}`;
          const open = expandedWorkflow === id;
          return (
            <div className="workflow" key={id}>
              <button onClick={() => setExpandedWorkflow(open ? '' : id)}>
                <strong>{id}</strong>
                <span>{count(workflow.steps)} steps</span>
                <ChevronDown size={16} className={open ? 'rotate' : ''} />
              </button>
              {open && <List items={workflow.steps?.map((step) => step.step || step)} fallback="No steps extracted." />}
            </div>
          );
        }) : <EmptyInline message="No workflows extracted." />}
      </div>

      <div className="panel">
        <PanelHeader icon={AlertTriangle} title="Risks" />
        <List items={(context.risks || []).map((risk) => risk.risk || risk.title)} fallback="No risks extracted." />
      </div>

      <div className="panel">
        <PanelHeader icon={History} title="Version history" />
        <List items={history.map((item) => `v${item.version} · ${item.status} · ${pct(item.confidence)} · ${time(item.generatedAt)}`)} fallback="No history yet." />
      </div>
    </section>
  );
}

function KnowledgeNetwork({ context }) {
  const network = buildKnowledgeNetwork(context);
  if (!network.nodes.length) return null;
  return (
    <div className="panel span-2 network-panel">
      <PanelHeader icon={Map} title="Knowledge network" />
      <p className="network-hint">Your business sits at the centre. Each branch groups related knowledge — the small connected notes are the specific items Orgni found.</p>
      <div className="network-wrap" aria-label="Knowledge map network">
        <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {network.edges.map((edge) => {
            const from = network.nodeMap.get(edge.from);
            const to = network.nodeMap.get(edge.to);
            if (!from || !to) return null;
            return <line key={`${edge.from}-${edge.to}`} className={`edge ${edge.kind} ${edge.type || ''}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}
        </svg>
        {network.nodes.map((node) => (
          <div
            className={`network-node ${node.kind} ${node.type}`}
            key={node.id}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            title={node.label}
          >
            {node.kind !== 'leaf' && <span className="node-dot" aria-hidden="true" />}
            <strong>{node.label}</strong>
            {node.count != null && <em>{node.count} {node.count === 1 ? 'item' : 'items'}</em>}
          </div>
        ))}
      </div>
      {network.legend.length ? (
        <div className="network-legend">
          {network.legend.map((item) => <span key={item.type} className={item.type}><i className="dot" />{item.label}</span>)}
        </div>
      ) : (
        <p className="empty-inline">No branches extracted yet — upload more detail and rebuild the map.</p>
      )}
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
    { key: 'workflow', label: 'Workflows', items: (context.workflows || []).map((item) => item.workflow_name || item.name || item) },
    { key: 'role', label: 'Roles', items: (context.roles || []).map((item) => item.role || item.name || item) },
    { key: 'department', label: 'Departments', items: (context.departments || []).map((item) => item.name || item.department || item) },
    { key: 'rule', label: 'Rules', items: (context.rules || []).map((item) => item.rule_name || item.rule || item.condition || item) },
    { key: 'risk', label: 'Risks', items: (context.risks || []).map((item) => item.risk || item.title || item) }
  ]
    .map((cat) => ({ ...cat, items: cat.items.map(textValue).filter(Boolean) }))
    .filter((cat) => cat.items.length);

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
    const visible = cat.items.slice(0, 5);
    nodes.push({ id: hubId, label: cat.label, count: cat.items.length, type: cat.key, kind: 'hub', x: hx, y: hy });
    edges.push({ from: 'business', to: hubId, kind: 'trunk', type: cat.key });

    const k = visible.length;
    const spread = k <= 1 ? 0 : Math.min(Math.PI * 0.55, 0.34 * (k - 1));
    visible.forEach((label, j) => {
      const t = k === 1 ? 0 : (j / (k - 1)) - 0.5;
      const childAngle = angle + t * spread;
      const lx = cx + leafRx * Math.cos(childAngle);
      const ly = cy + leafRy * Math.sin(childAngle);
      const leafId = `${cat.key}-leaf-${slug(label)}-${j}`;
      nodes.push({ id: leafId, label: trim(label, 48), type: cat.key, kind: 'leaf', x: lx, y: ly });
      edges.push({ from: hubId, to: leafId, kind: 'branch', type: cat.key });
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

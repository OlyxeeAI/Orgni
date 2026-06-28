// In-device (browser) fallback data layer.
// Used automatically when the backend API is unreachable (e.g. a static
// frontend-only deployment). On a full deployment the real API answers with
// JSON and this module is never invoked. Data persists in localStorage so it
// survives reloads on the same device/browser.
//
// AI-powered endpoints (operating-model build, Lucy chat, finding/exception
// scans) require a live backend and degrade gracefully here.

const STORE_KEY = 'orgni:local:v1';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt store
  }
  return { organizations: [], byOrg: {} };
}

function saveStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // storage full / unavailable — best effort only
  }
}

function orgBucket(store, orgId) {
  if (!store.byOrg[orgId]) store.byOrg[orgId] = { documents: [], workflows: [], exceptions: [] };
  const b = store.byOrg[orgId];
  b.documents ||= [];
  b.workflows ||= [];
  b.exceptions ||= [];
  return b;
}

function extOf(name = '') {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : 'file';
}

function dashboardFor(store, orgId) {
  const b = orgBucket(store, orgId);
  const exceptionsOpen = b.exceptions.filter((e) => e.status !== 'resolved').length;
  const ctx = b.context || null;
  const summary = ctx ? (ctx.summary?.plain_english_summary || '') : '';
  return {
    summary,
    knowledge: { status: ctx ? 'ready' : 'empty' },
    counts: {
      documents: b.documents.length,
      failedDocuments: 0,
      findingsTotal: 0,
      findingsNeedingReview: 0,
      findingsVerified: 0,
      workflowsSaved: b.workflows.length,
      workflowsApproved: b.workflows.filter((w) => w.status === 'approved').length,
      workflowsDetected: 0,
      exceptionsTotal: b.exceptions.length,
      exceptionsOpen,
      confidence: ctx ? (ctx.confidence || 0) : 0
    },
    recentActivity: [],
    recommendedNextSteps: ctx ? (ctx.recommendedNextSteps || []) : []
  };
}

function domainContext(ctx, domain) {
  if (!ctx) return null;
  if (domain === 'workflow') {
    return {
      workflows: ctx.workflows,
      roles: ctx.roles,
      dependencies: ctx.dependencies,
      bottlenecks: ctx.bottlenecks,
      blueprint: ctx.blueprint,
      missingInformation: ctx.missingInformation
    };
  }
  if (domain === 'finance') {
    return {
      rules: ctx.rules,
      approvals: ctx.approvals,
      exceptions: ctx.exceptions,
      risks: ctx.risks,
      gaps: ctx.gaps
    };
  }
  return null;
}

// Builds the operating model by calling the Vercel serverless AI function
// (/api/build). Called directly (not through api()) so it never recurses into
// this fallback layer. Throws a clear error when AI is unavailable.
async function buildModel(org, documents) {
  let res;
  try {
    res = await fetch('/api/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org,
        documents: documents.map((d) => ({ id: d.id, name: d.name, text: d.content || '' }))
      })
    });
  } catch {
    throw new Error('Building the operating model needs the AI service, which is not reachable from this deployment.');
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('Building the operating model needs an AI endpoint that is not deployed here. Add the /api/build serverless function and an AI API key.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to build the operating model.');
  return data.context;
}

function exceptionStats(list) {
  const open = list.filter((e) => e.status !== 'resolved').length;
  const resolved = list.filter((e) => e.status === 'resolved').length;
  return { open, resolved, total: list.length };
}

const OFFLINE_AI_MESSAGE =
  'This needs the live Orgni backend (AI) and is not available in on-device mode.';

// Returns parsed-JSON-equivalent data, or throws Error like the real api() does.
export async function localApi(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const clean = path.split('?')[0].replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean); // ['api','orgs',...]
  const store = loadStore();

  let body = {};
  if (options.body && !(options.body instanceof FormData)) {
    try { body = JSON.parse(options.body); } catch { body = {}; }
  }

  const toOrg = (raw) => ({
    id: raw.id,
    name: raw.name || '',
    businessType: raw.businessType || '',
    departments: raw.departments || [],
    keyWorkflows: raw.keyWorkflows || [],
    currentTools: raw.currentTools || [],
    mainProblems: raw.mainProblems || [],
    createdAt: raw.createdAt || new Date().toISOString()
  });

  // /api/orgs
  if (parts.length === 2 && parts[1] === 'orgs') {
    if (method === 'GET') return { organizations: store.organizations };
    if (method === 'POST') {
      const org = toOrg({ ...body, id: newId() });
      store.organizations.push(org);
      orgBucket(store, org.id);
      saveStore(store);
      return { organization: org };
    }
  }

  // /api/orgs/:id (and deeper)
  if (parts.length >= 3 && parts[1] === 'orgs') {
    const orgId = parts[2];
    const sub = parts.slice(3); // remaining segments after the org id
    const org = store.organizations.find((o) => o.id === orgId);

    // /api/orgs/:id
    if (sub.length === 0) {
      if (method === 'PATCH') {
        if (!org) throw new Error('Business not found');
        Object.assign(org, toOrg({ ...org, ...body, id: orgId }));
        saveStore(store);
        return { organization: org };
      }
      if (method === 'DELETE') {
        store.organizations = store.organizations.filter((o) => o.id !== orgId);
        delete store.byOrg[orgId];
        saveStore(store);
        return {};
      }
    }

    const b = orgBucket(store, orgId);

    // /api/orgs/:id/dashboard
    if (sub[0] === 'dashboard') return dashboardFor(store, orgId);

    // /api/orgs/:id/documents ...
    if (sub[0] === 'documents') {
      if (sub.length === 1 && method === 'GET') {
        return { documents: b.documents.map(({ content, ...rest }) => rest) };
      }
      if (sub.length === 1 && method === 'POST') {
        const files = options.body instanceof FormData ? options.body.getAll('files') : [];
        let added = 0;
        for (const file of files) {
          if (!file || typeof file.name !== 'string') continue;
          let wordCount = 0;
          try {
            const text = await file.text();
            wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
          } catch {
            wordCount = 0;
          }
          let content = '';
          try { content = await file.text(); } catch { content = ''; }
          b.documents.push({
            id: newId(),
            name: file.name,
            fileType: extOf(file.name),
            fileSize: file.size || 0,
            wordCount,
            status: 'parsed',
            parseError: null,
            content
          });
          added += 1;
        }
        saveStore(store);
        return { message: `${added} document(s) saved on this device`, rejected: [] };
      }
      if (sub.length === 2 && method === 'DELETE') {
        b.documents = b.documents.filter((d) => d.id !== sub[1]);
        saveStore(store);
        return {};
      }
    }

    // /api/orgs/:id/workflows ...
    if (sub[0] === 'workflows') {
      if (sub.length === 1 && method === 'GET') return { workflows: b.workflows, detected: [] };
      if (sub.length === 1 && method === 'POST') {
        const wf = { ...body, id: newId(), status: body.status || 'approved', createdAt: new Date().toISOString() };
        b.workflows.push(wf);
        saveStore(store);
        return { workflow: wf };
      }
      if (sub.length === 2 && method === 'PATCH') {
        const wf = b.workflows.find((w) => w.id === sub[1]);
        if (wf) Object.assign(wf, body);
        saveStore(store);
        return { workflow: wf || null };
      }
      if (sub.length === 2 && method === 'DELETE') {
        b.workflows = b.workflows.filter((w) => w.id !== sub[1]);
        saveStore(store);
        return {};
      }
    }

    // /api/orgs/:id/exceptions ...
    if (sub[0] === 'exceptions') {
      if (sub.length === 1 && method === 'GET') return { exceptions: b.exceptions, stats: exceptionStats(b.exceptions) };
      if (sub.length === 2 && sub[1] === 'scan' && method === 'POST') return { created: 0 };
      if (sub.length === 1 && method === 'POST') {
        const ex = { ...body, id: newId(), status: body.status || 'open', createdAt: new Date().toISOString() };
        b.exceptions.push(ex);
        saveStore(store);
        return { exception: ex };
      }
      if (sub.length === 2 && method === 'PATCH') {
        const ex = b.exceptions.find((e) => e.id === sub[1]);
        if (ex) Object.assign(ex, body);
        saveStore(store);
        return { exception: ex || null };
      }
    }

    // /api/orgs/:id/engine/...
    if (sub[0] === 'engine') {
      const eng = sub.slice(1);
      if (eng[0] === 'validation' && eng.length === 1) return { stats: {}, items: [] };
      if (eng[0] === 'history') return { versions: b.versions || [] };
      if (eng[0] === 'context') {
        if (eng.length === 1) return { context: b.context || null };
        if (eng[1] === 'workflow' || eng[1] === 'finance') {
          return { context: domainContext(b.context, eng[1]) };
        }
        return { context: null };
      }
      if (eng[0] === 'intake' && method === 'POST') {
        if (!org) throw new Error('Business not found');
        const context = await buildModel(org, b.documents.filter((d) => d.status === 'parsed'));
        const version = (b.version || 0) + 1;
        b.version = version;
        b.context = { ...context, version };
        b.versions = [
          { version, generatedAt: new Date().toISOString(), confidence: context.confidence || 0 },
          ...(b.versions || [])
        ];
        saveStore(store);
        return { version };
      }
      if (eng[0] === 'chat') {
        return {
          answer: `${OFFLINE_AI_MESSAGE} Your sources and notes are still saved on this device.`,
          grounded: false,
          sources: [],
          confidence: null,
          workflow: null,
          rules: [],
          risks: [],
          missing: [],
          suggestedActions: [],
          trail: null
        };
      }
      // intake / actions / validation review — genuinely need AI
      throw new Error(OFFLINE_AI_MESSAGE);
    }
  }

  throw new Error('This feature is not available in on-device mode.');
}

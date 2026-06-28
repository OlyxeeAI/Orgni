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
  return {
    summary: '',
    knowledge: { status: 'empty' },
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
      confidence: 0
    },
    recentActivity: [],
    recommendedNextSteps: []
  };
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
      if (sub.length === 1 && method === 'GET') return { documents: b.documents };
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
          b.documents.push({
            id: newId(),
            name: file.name,
            fileType: extOf(file.name),
            fileSize: file.size || 0,
            wordCount,
            status: 'ready',
            parseError: null
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
      if (eng[0] === 'history') return { versions: [] };
      if (eng[0] === 'context') return { context: null };
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

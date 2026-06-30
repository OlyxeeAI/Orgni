import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CodeBlock } from "@/components/code-block";
import { DocMobileNav } from "@/components/doc-mobile-nav";
import { useWaitlist } from "@/components/waitlist-dialog";
import { useSeo } from "@/hooks/use-seo";

type Method = "GET" | "POST" | "PATCH";

const methodStyle: Record<Method, string> = {
  GET: "bg-muted text-foreground border border-border",
  POST: "bg-primary text-primary-foreground",
  PATCH: "bg-primary/10 text-primary border border-primary/30",
};

type Resource = {
  id: string;
  title: string;
  desc: string;
  group: string;
  endpoints: { method: Method; path: string; label: string }[];
};

const resources: Resource[] = [
  {
    id: "organizations",
    title: "Organizations",
    desc: "Create and manage the businesses that own context. An organization is the top-level container for every source, workflow, and finance record.",
    group: "Core resources",
    endpoints: [
      { method: "POST", path: "/v1/organizations", label: "Create an organization." },
      { method: "GET", path: "/v1/organizations/{id}", label: "Retrieve an organization profile." },
      { method: "PATCH", path: "/v1/organizations/{id}", label: "Update organization details." },
      { method: "GET", path: "/v1/organizations/{id}/roles", label: "List departments and roles." },
    ],
  },
  {
    id: "sources",
    title: "Sources",
    desc: "Upload and manage the raw business information Orgni reads: documents, spreadsheets, notes, and connected systems.",
    group: "Core resources",
    endpoints: [
      { method: "POST", path: "/v1/sources", label: "Upload a source for processing." },
      { method: "GET", path: "/v1/sources/{id}", label: "Get the processing status of a source." },
      { method: "GET", path: "/v1/sources", label: "List all sources for an organization." },
    ],
  },
  {
    id: "context",
    title: "Context Extraction",
    desc: "Turn raw sources into structured business context. Extractions run asynchronously and emit a webhook when complete.",
    group: "Core resources",
    endpoints: [
      { method: "POST", path: "/v1/extractions", label: "Start a context extraction job." },
      { method: "GET", path: "/v1/extractions/{id}", label: "Retrieve an extraction result." },
    ],
  },
  {
    id: "business-map",
    title: "Business Map",
    desc: "Retrieve the organization's structured operating map: roles, departments, rules, and the dependencies between them.",
    group: "Core resources",
    endpoints: [
      { method: "GET", path: "/v1/business-map", label: "Get the full business map." },
      { method: "GET", path: "/v1/business-map/dependencies", label: "List dependencies between entities." },
    ],
  },
  {
    id: "workflows",
    title: "Workflows",
    desc: "Access detected workflows, their steps, and the approval rules that govern them.",
    group: "Execution",
    endpoints: [
      { method: "GET", path: "/v1/workflows", label: "List detected workflows." },
      { method: "GET", path: "/v1/workflows/{id}/steps", label: "Get the ordered steps of a workflow." },
      { method: "GET", path: "/v1/workflows/{id}/approvals", label: "Get the approval rules for a workflow." },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    desc: "Reconciliation results, matched transactions, and exceptions that need review.",
    group: "Execution",
    endpoints: [
      { method: "GET", path: "/v1/finance/statements", label: "List ingested statements." },
      { method: "GET", path: "/v1/finance/reconciliation", label: "Get reconciliation results." },
      { method: "GET", path: "/v1/finance/exceptions", label: "List unresolved exceptions." },
    ],
  },
  {
    id: "evidence",
    title: "Evidence",
    desc: "Trace every extracted fact back to its exact source (document, page, and snippet) with a confidence score.",
    group: "Execution",
    endpoints: [
      { method: "GET", path: "/v1/evidence/{factId}", label: "Get the evidence backing a single fact." },
    ],
  },
  {
    id: "updates",
    title: "Updates",
    desc: "Correct and verify business knowledge as it changes over time.",
    group: "Execution",
    endpoints: [
      { method: "PATCH", path: "/v1/context/{id}", label: "Correct an extracted piece of context." },
      { method: "POST", path: "/v1/context/{id}/verify", label: "Mark information as human-verified." },
    ],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    desc: "Register endpoints to be notified when important events happen, so your systems stay in sync.",
    group: "Events",
    endpoints: [
      { method: "POST", path: "/v1/webhooks", label: "Register a webhook endpoint." },
      { method: "GET", path: "/v1/webhooks", label: "List registered webhooks." },
    ],
  },
];

const errors = [
  { code: "200", name: "OK", desc: "The request succeeded." },
  { code: "400", name: "Bad Request", desc: "The request was malformed or missing required fields." },
  { code: "401", name: "Unauthorized", desc: "The API key is missing or invalid." },
  { code: "403", name: "Forbidden", desc: "The key is valid but lacks the required scope." },
  { code: "404", name: "Not Found", desc: "The requested resource does not exist." },
  { code: "409", name: "Conflict", desc: "The resource is in a state that conflicts with the request." },
  { code: "429", name: "Too Many Requests", desc: "Rate limit exceeded. Retry with exponential backoff." },
  { code: "500", name: "Server Error", desc: "An unexpected error occurred on Orgni's side." },
];

const webhookEvents = [
  { event: "source.processed", desc: "A source finished processing." },
  { event: "context.extracted", desc: "An extraction job completed." },
  { event: "workflow.detected", desc: "A new workflow was identified." },
  { event: "finance.exception.created", desc: "A reconciliation exception was raised." },
  { event: "review.required", desc: "A fact dropped below the confidence threshold." },
  { event: "context.updated", desc: "Existing context was corrected or verified." },
];

const navSections = [
  { id: "overview", label: "Overview", group: "Get started" },
  { id: "authentication", label: "Authentication", group: "Get started" },
  { id: "errors", label: "Errors", group: "Get started" },
  ...resources.map((r) => ({ id: r.id, label: r.title, group: r.group })),
];

const navGroups = Array.from(new Set(navSections.map((s) => s.group))).map((group) => ({
  group,
  items: navSections.filter((s) => s.group === group),
}));

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className="inline-flex items-center justify-center h-7 w-7 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}

function MethodBadge({ method }: { method: Method }) {
  return (
    <span
      className={`font-mono text-[11px] font-bold px-2 py-1 rounded-sm shrink-0 w-14 text-center ${methodStyle[method]}`}
    >
      {method}
    </span>
  );
}

export default function Api() {
  const { open } = useWaitlist();
  const [active, setActive] = useState("overview");
  useSeo({
    title: "API Reference - Orgni",
    description:
      "The Orgni API reference: authenticate, read structured business context, workflows, finance intelligence, and source-backed evidence over a REST/JSON API.",
    path: "/api-reference",
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActive(topmost.target.id);
        }
      },
      { rootMargin: "-20% 0px -72% 0px" }
    );
    navSections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    let tries = 0;
    const tick = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else if (tries++ < 40) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const handleNav = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <SiteHeader />

      <DocMobileNav sections={navSections} active={active} onNav={handleNav} />

      <div className="container max-w-screen-2xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_200px] lg:gap-10 xl:gap-12">
          {/* Left sidebar nav */}
          <aside className="hidden lg:block border-r border-border">
            <nav className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto py-10 pr-6 space-y-8">
              {navGroups.map((g) => (
                <div key={g.group}>
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    {g.group}
                  </div>
                  <ul className="space-y-1">
                    {g.items.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={(e) => handleNav(e, item.id)}
                          aria-current={active === item.id ? "true" : undefined}
                          className={`block text-sm py-1.5 pl-3 border-l-2 transition-colors ${
                            active === item.id
                              ? "border-primary text-foreground font-medium"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                          }`}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="min-w-0 max-w-3xl py-10 md:py-14">
            {/* Overview */}
            <section id="overview" className="scroll-mt-24">
              <div className="font-mono text-xs font-bold text-primary mb-3">API REFERENCE · PREVIEW</div>
              <h1 className="text-4xl font-bold tracking-tight mb-5">Orgni API</h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                The Orgni API gives applications programmatic access to business context, workflows, finance
                intelligence, and source-backed evidence, so you can build business-aware software without
                making the business explain itself from scratch every time.
              </p>

              <div className="border border-primary/30 bg-primary/5 rounded-sm p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="font-semibold">Preview: not yet live.</span>{" "}
                  <span className="text-muted-foreground">
                    This reference describes the planned Orgni API. The endpoints below are not callable yet.
                    Request access to get keys and a stable spec at launch.
                  </span>
                </p>
                <Button onClick={open} className="rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                  Request access
                </Button>
              </div>

              <dl className="divide-y divide-border border-y border-border mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-6 py-3">
                  <dt className="font-mono text-sm font-bold">Base URL</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-mono text-[13px] text-muted-foreground">https://api.orgni.com</span>
                    <CopyButton value="https://api.orgni.com" label="Copy base URL" />
                  </dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-6 py-3">
                  <dt className="font-mono text-sm font-bold">Protocol</dt>
                  <dd className="text-[15px] text-muted-foreground">REST over HTTPS, JSON request and response bodies.</dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-6 py-3">
                  <dt className="font-mono text-sm font-bold">Versioning</dt>
                  <dd className="text-[15px] text-muted-foreground">
                    Pinned in the URL path (<span className="font-mono text-[13px]">/v1</span>).
                  </dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-6 py-3">
                  <dt className="font-mono text-sm font-bold">Async jobs</dt>
                  <dd className="text-[15px] text-muted-foreground">
                    Extractions run in the background and notify you via webhooks.
                  </dd>
                </div>
              </dl>
            </section>

            {/* Authentication */}
            <section id="authentication" className="scroll-mt-24 border-t border-border mt-14 pt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-3">Authentication</h2>
              <p className="text-[15px] text-muted-foreground leading-7 mb-2">
                Authenticate every request with a secret API key sent as a bearer token. Keys are scoped to a
                single organization, and each key carries explicit permission scopes.
              </p>
              <p className="text-[15px] text-muted-foreground leading-7">
                Pass the target organization with the{" "}
                <span className="font-mono text-[13px]">X-Org-Id</span> header. Never expose secret keys in
                client-side code.
              </p>
              <CodeBlock title="AUTHORIZED REQUEST">{`curl https://api.orgni.com/v1/business-map \\
  -H "Authorization: Bearer org_sk_live_..." \\
  -H "X-Org-Id: org_8f2a91"`}</CodeBlock>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["Bearer keys", "Org-scoped", "HTTPS only", "Permission scopes"].map((item) => (
                  <div key={item} className="flex items-center gap-2 border border-border bg-card p-3 rounded-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span className="font-mono text-[11px] font-medium truncate">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Errors */}
            <section id="errors" className="scroll-mt-24 border-t border-border mt-14 pt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-3">Errors</h2>
              <p className="text-[15px] text-muted-foreground leading-7 mb-6">
                Orgni uses conventional HTTP status codes. Every error returns a JSON body with a stable{" "}
                <span className="font-mono text-[13px]">code</span> and a human-readable{" "}
                <span className="font-mono text-[13px]">message</span>.
              </p>
              <div className="border-y border-border divide-y divide-border mb-2">
                {errors.map((er) => (
                  <div key={er.code} className="grid grid-cols-[56px_1fr] sm:grid-cols-[56px_160px_1fr] gap-3 sm:gap-6 py-3 items-baseline">
                    <span className="font-mono text-sm font-bold">{er.code}</span>
                    <span className="font-mono text-[13px] text-foreground">{er.name}</span>
                    <span className="text-sm text-muted-foreground col-span-2 sm:col-span-1">{er.desc}</span>
                  </div>
                ))}
              </div>
              <CodeBlock title="ERROR RESPONSE">{`{
  "error": {
    "code": "source_not_found",
    "message": "No source exists with id src_19fa2c.",
    "status": 404
  }
}`}</CodeBlock>
            </section>

            {/* Resource sections */}
            {resources.map((r) => (
              <section key={r.id} id={r.id} className="scroll-mt-24 border-t border-border mt-14 pt-12">
                <h2 className="text-2xl font-bold tracking-tight mb-3">{r.title}</h2>
                <p className="text-[15px] text-muted-foreground leading-7 mb-6">{r.desc}</p>
                <div className="space-y-2.5">
                  {r.endpoints.map((e) => (
                    <div
                      key={e.path + e.label}
                      className="group flex items-start gap-3 border border-border rounded-sm bg-card p-3 hover:border-primary/40 transition-colors"
                    >
                      <MethodBadge method={e.method} />
                      <div className="min-w-0 pt-0.5 flex-1">
                        <code className="font-mono text-[13px] block break-all">{e.path}</code>
                        <p className="text-sm text-muted-foreground mt-1 leading-6">{e.label}</p>
                      </div>
                      <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <CopyButton value={e.path} label={`Copy ${e.path}`} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Business Map gets an example response */}
                {r.id === "business-map" && (
                  <CodeBlock title="EXAMPLE RESPONSE">{`{
  "org_id": "org_8f2a91",
  "departments": [
    { "id": "dep_finance", "name": "Finance", "roles": ["approver", "analyst"] }
  ],
  "rules": [
    { "id": "rule_204", "name": "Invoices over R10,000 require approval" }
  ],
  "dependencies": 42,
  "confidence": 0.94
}`}</CodeBlock>
                )}

                {/* Evidence gets its field list */}
                {r.id === "evidence" && (
                  <CodeBlock title="EVIDENCE OBJECT">{`{
  "fact_id": "fact_55ab",
  "source_document": "supplier_agreement.pdf",
  "page": 4,
  "snippet": "Payment terms are net 30 days...",
  "confidence": 0.91,
  "validation_status": "verified",
  "timestamp": "2026-06-15T09:24:00Z"
}`}</CodeBlock>
                )}

                {/* Webhooks get events + payload */}
                {r.id === "webhooks" && (
                  <>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mt-8 mb-4">
                      Event types
                    </h3>
                    <div className="border-y border-border divide-y divide-border mb-2">
                      {webhookEvents.map((w) => (
                        <div key={w.event} className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-1 sm:gap-6 py-3">
                          <span className="font-mono text-[13px] text-foreground">{w.event}</span>
                          <span className="text-sm text-muted-foreground">{w.desc}</span>
                        </div>
                      ))}
                    </div>
                    <CodeBlock title="WEBHOOK PAYLOAD">{`{
  "event": "finance.exception.created",
  "org_id": "org_8f2a91",
  "data": {
    "exception_id": "exc_77c1",
    "reason": "Unmatched transaction",
    "amount": "R4,250.00"
  },
  "created_at": "2026-06-15T09:24:00Z"
}`}</CodeBlock>
                  </>
                )}
              </section>
            ))}

            {/* Next steps */}
            <div className="border-t border-border mt-14 pt-12">
              <div className="border border-border rounded-sm p-6 bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold mb-1">New to Orgni?</h3>
                  <p className="text-sm text-muted-foreground">
                    Read the concepts and quickstart in the documentation.
                  </p>
                </div>
                <Link
                  href="/docs"
                  className="group inline-flex items-center gap-2 text-sm font-medium text-primary shrink-0"
                >
                  Go to docs
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </main>

          {/* Right "on this page" TOC */}
          <aside className="hidden xl:block">
            <div className="sticky top-20 py-14 pl-2">
              <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                On this page
              </div>
              <ul className="space-y-1.5 border-l border-border">
                {navSections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={(e) => handleNav(e, s.id)}
                      aria-current={active === s.id ? "true" : undefined}
                      className={`block text-[13px] pl-3 -ml-px border-l transition-colors ${
                        active === s.id
                          ? "border-primary text-primary font-medium"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

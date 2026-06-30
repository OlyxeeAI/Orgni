import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CodeBlock } from "@/components/code-block";
import { DocMobileNav } from "@/components/doc-mobile-nav";
import { useWaitlist } from "@/components/waitlist-dialog";
import { useSeo } from "@/hooks/use-seo";

const sections = [
  { id: "introduction", label: "Introduction", group: "Get started" },
  { id: "how-it-works", label: "How it works", group: "Get started" },
  { id: "quickstart", label: "Quickstart", group: "Get started" },
  { id: "core-concepts", label: "Core concepts", group: "Concepts" },
  { id: "structured-outputs", label: "Structured outputs", group: "Concepts" },
  { id: "use-cases", label: "Use cases", group: "Guides" },
  { id: "next-steps", label: "Next steps", group: "Guides" },
];

const navGroups = Array.from(new Set(sections.map((s) => s.group))).map((group) => ({
  group,
  items: sections.filter((s) => s.group === group),
}));

const usableBy = [
  "Operational workflows",
  "Finance teams",
  "Internal dashboards",
  "External AI systems",
  "Business applications",
  "Automation tools",
];

const flow = [
  { title: "Business inputs", desc: "You provide documents, spreadsheets, notes, voice, or connected systems." },
  { title: "Orgni reads and extracts context", desc: "It parses your sources and pulls out the facts that matter." },
  { title: "Orgni builds a business map", desc: "Roles, departments, rules, and relationships are structured into one model." },
  { title: "Orgni identifies workflows and finance logic", desc: "Approvals, handovers, exceptions, and review trails are detected." },
  { title: "Orgni creates structured outputs", desc: "Everything becomes machine-readable context with an evidence trail." },
  { title: "Tools and AI systems execute safely", desc: "Your applications act on context they can trust." },
];

const quickstart = [
  { step: "Create an organization", desc: "Set up the workspace that represents your business." },
  { step: "Upload business sources", desc: "Add documents, spreadsheets, notes, or connect a system." },
  { step: "Review extracted context", desc: "Check the roles, rules, and processes Orgni found." },
  { step: "Confirm roles, rules, and workflows", desc: "Verify the operating logic before it goes live." },
  { step: "Connect workflow or finance modules", desc: "Turn on execution where you need it." },
  { step: "Use the API to retrieve context", desc: "Pull structured context into your own systems." },
];

const concepts = [
  { name: "Organization", desc: "The business or company using Orgni." },
  { name: "Sources", desc: "Documents, spreadsheets, notes, voice, connected systems, and uploads." },
  { name: "Business Context", desc: "The structured understanding of how the business works." },
  { name: "Workflows", desc: "Processes, approvals, handovers, tasks, escalations, and next actions." },
  { name: "Finance Context", desc: "Statements, ledgers, invoices, matches, exceptions, and review trails." },
  { name: "Evidence Trail", desc: "A record showing where each extracted fact came from." },
  { name: "Confidence", desc: "A score showing how reliable Orgni believes a fact is." },
  { name: "Exceptions", desc: "Items that need human review when Orgni can't fully verify them." },
];

const outputs = ["Roles", "Departments", "Rules", "Policies", "Workflows", "Approval paths", "Finance records", "Exceptions"];

const useCases = [
  { tag: "Operations", desc: "Upload process documents and Orgni identifies tasks, approvals, roles, and escalation paths." },
  { tag: "Finance", desc: "Upload statements, ledgers, and invoices. Orgni helps identify matches, exceptions, and evidence." },
  { tag: "AI enablement", desc: "Give AI systems reliable business context before they generate outputs or take action." },
  { tag: "Legacy businesses", desc: "Help companies with old systems, spreadsheets, and manual processes become AI-ready." },
];

export default function Docs() {
  const { open } = useWaitlist();
  useSeo({
    title: "Documentation - Orgni",
    description:
      "Orgni documentation: learn how Orgni turns your documents, workflows, roles, and finance records into structured business context that your tools and AI systems can use.",
    path: "/docs",
  });
  const [active, setActive] = useState("introduction");

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
    sections.forEach((s) => {
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

      <DocMobileNav sections={sections} active={active} onNav={handleNav} />

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
            {/* Introduction */}
            <section id="introduction" className="scroll-mt-24">
              <div className="font-mono text-xs font-bold text-primary mb-3">DOCUMENTATION</div>
              <h1 className="text-4xl font-bold tracking-tight mb-5">Introduction</h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Orgni helps businesses turn scattered information into structured context that workflows, finance
                tools, and AI systems can use.
              </p>
              <p className="text-[15px] text-muted-foreground leading-7 mb-5">
                Orgni reads documents, workflows, roles, rules, approvals, finance records, and operational
                explanations, then makes that knowledge usable across your stack:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-2">
                {usableBy.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[15px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="scroll-mt-24 border-t border-border mt-14 pt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-3">How it works</h2>
              <p className="text-[15px] text-muted-foreground leading-7 mb-8">
                Orgni moves your business knowledge from raw inputs to safe execution in six stages.
              </p>
              <ol className="space-y-0">
                {flow.map((f, i) => (
                  <li key={f.title} className="flex gap-4 pb-8 last:pb-0 relative">
                    {i < flow.length - 1 && (
                      <span className="absolute left-[15px] top-9 bottom-0 w-px bg-border" aria-hidden="true" />
                    )}
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 h-8 w-8 rounded-sm flex items-center justify-center shrink-0 z-10">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="pt-1">
                      <h3 className="text-[15px] font-semibold mb-1">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-6">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Quickstart */}
            <section id="quickstart" className="scroll-mt-24 border-t border-border mt-14 pt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-3">Quickstart</h2>
              <p className="text-[15px] text-muted-foreground leading-7 mb-8">
                Get from a new workspace to structured context your systems can read in six steps.
              </p>
              <ol className="space-y-5 mb-10">
                {quickstart.map((s, i) => (
                  <li key={s.step} className="flex gap-4">
                    <span className="font-mono text-sm font-bold text-primary/40 leading-7 shrink-0 w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold mb-0.5">{s.step}</h3>
                      <p className="text-sm text-muted-foreground leading-6">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="text-[15px] text-muted-foreground leading-7 mb-3">
                Once context is built, retrieve it from your own systems with a single request:
              </p>
              <CodeBlock title="RETRIEVE CONTEXT">{`curl https://api.orgni.com/v1/business-map \\
  -H "Authorization: Bearer org_sk_live_..." \\
  -H "X-Org-Id: org_8f2a91"`}</CodeBlock>
              <p className="text-sm text-muted-foreground mt-4">
                See the{" "}
                <Link href="/api-reference" className="text-primary font-medium hover:underline">
                  full API reference
                </Link>{" "}
                for every endpoint.
              </p>
            </section>

            {/* Core concepts */}
            <section id="core-concepts" className="scroll-mt-24 border-t border-border mt-14 pt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-3">Core concepts</h2>
              <p className="text-[15px] text-muted-foreground leading-7 mb-6">
                A shared vocabulary for everything Orgni extracts and exposes.
              </p>
              <dl className="divide-y divide-border border-t border-border">
                {concepts.map((c) => (
                  <div key={c.name} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-6 py-4">
                    <dt className="font-mono text-sm font-bold">{c.name}</dt>
                    <dd className="text-[15px] text-muted-foreground leading-6">{c.desc}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Structured outputs */}
            <section id="structured-outputs" className="scroll-mt-24 border-t border-border mt-14 pt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-3">Structured outputs</h2>
              <p className="text-[15px] text-muted-foreground leading-7 mb-6">
                Everything Orgni learns is exposed as structured, machine-readable output, each backed by an
                evidence trail and a confidence score.
              </p>
              <div className="flex flex-wrap gap-2">
                {outputs.map((o) => (
                  <span
                    key={o}
                    className="font-mono text-xs bg-muted border border-border px-3 py-1.5 rounded-sm"
                  >
                    {o}
                  </span>
                ))}
              </div>
            </section>

            {/* Use cases */}
            <section id="use-cases" className="scroll-mt-24 border-t border-border mt-14 pt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-3">Use cases</h2>
              <p className="text-[15px] text-muted-foreground leading-7 mb-6">
                What teams build once their business context is structured.
              </p>
              <div className="space-y-4">
                {useCases.map((u) => (
                  <div key={u.tag} className="border border-border rounded-sm p-5 bg-card">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-primary mb-2">
                      {u.tag}
                    </h3>
                    <p className="text-[15px] text-muted-foreground leading-6">{u.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Next steps */}
            <section id="next-steps" className="scroll-mt-24 border-t border-border mt-14 pt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-3">Next steps</h2>
              <p className="text-[15px] text-muted-foreground leading-7 mb-6">
                Keep going, or get early access to the execution engine.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                <Link
                  href="/api-reference"
                  className="group border border-border rounded-sm p-5 bg-card hover:border-primary/60 transition-colors"
                >
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Reference
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold">API Reference</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
                <Link
                  href="/pricing"
                  className="group border border-border rounded-sm p-5 bg-card hover:border-primary/60 transition-colors"
                >
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Plans
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold">Pricing</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </div>
              <div className="border border-border rounded-sm p-6 bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold mb-1">Ready to give your business context to AI?</h3>
                  <p className="text-sm text-muted-foreground">
                    The engine is in active development. Request access for early access.
                  </p>
                </div>
                <Button
                  onClick={open}
                  className="rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                >
                  Try it for free
                </Button>
              </div>
            </section>
          </main>

          {/* Right "on this page" TOC */}
          <aside className="hidden xl:block">
            <div className="sticky top-20 py-14 pl-2">
              <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                On this page
              </div>
              <ul className="space-y-1.5 border-l border-border">
                {sections.map((s) => (
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

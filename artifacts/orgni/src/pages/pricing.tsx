import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useWaitlist } from "@/components/waitlist-dialog";
import { useSeo } from "@/hooks/use-seo";

type Billing = "monthly" | "annual";

type Plan = {
  name: string;
  bestFor: string;
  price: Record<Billing, string>;
  period: string;
  note: Record<Billing, string>;
  blurb: string;
  cta: string;
  variant: "default" | "outline";
  featured: boolean;
  highlightsLead?: string;
  highlights: string[];
};

const plans: Plan[] = [
  {
    name: "Developer",
    bestFor: "Solo builders & tests",
    price: { monthly: "R0", annual: "R0" },
    period: "/mo",
    note: { monthly: "Free forever", annual: "Free forever" },
    blurb: "For building and testing integrations.",
    cta: "Get Started",
    variant: "outline",
    featured: false,
    highlights: [
      "1 business map workspace",
      "Basic process and rule modeling",
      "100 document ingestion",
      "Community support",
    ],
  },
  {
    name: "Production",
    bestFor: "Live agents & teams",
    price: { monthly: "R499", annual: "R416" },
    period: "/mo",
    note: { monthly: "Billed monthly", annual: "R4,992 billed yearly" },
    blurb: "For live AI agents and workflows.",
    cta: "Start Production",
    variant: "default",
    featured: true,
    highlightsLead: "Everything in Developer, plus",
    highlights: [
      "Unlimited workflows and business maps",
      "Approvals, escalations, exceptions",
      "Finance reconciliation and evidence",
      "Audit trail export and email support",
    ],
  },
  {
    name: "Enterprise",
    bestFor: "Regulated operations",
    price: { monthly: "Custom", annual: "Custom" },
    period: "",
    note: { monthly: "Tailored to you", annual: "Tailored to you" },
    blurb: "For complex operational requirements.",
    cta: "Contact Sales",
    variant: "outline",
    featured: false,
    highlightsLead: "Everything in Production, plus",
    highlights: [
      "SSO / SAML and on-prem / VPC",
      "Bespoke integrations and connectors",
      "24/7 support with a dedicated CSM",
      "Custom concurrency and limits",
    ],
  },
];

type Cell = boolean | string;

const featureGroups: { group: string; rows: { label: string; values: [Cell, Cell, Cell] }[] }[] = [
  {
    group: "Context & Mapping",
    rows: [
      { label: "Business map", values: ["1 workspace", "Unlimited", "Unlimited"] },
      { label: "Process & rule modeling", values: ["Basic", "Advanced", "Advanced"] },
      { label: "Roles & approval chains", values: [false, true, true] },
      { label: "Document & policy ingestion", values: ["100 docs", "10k docs", "Unlimited"] },
    ],
  },
  {
    group: "Workflows & Execution",
    rows: [
      { label: "Active workflows", values: ["1", "Unlimited", "Unlimited"] },
      { label: "Approvals & escalations", values: [false, true, true] },
      { label: "Exception handling", values: [false, true, true] },
      { label: "Concurrent runs", values: ["50 / mo", "100k / mo", "Custom"] },
    ],
  },
  {
    group: "Finance",
    rows: [
      { label: "Reconciliation", values: [false, true, true] },
      { label: "Source evidence trail", values: [false, true, true] },
      { label: "Review queues", values: [false, true, true] },
    ],
  },
  {
    group: "Governance & Support",
    rows: [
      { label: "Audit trail export", values: [false, true, true] },
      { label: "SSO / SAML", values: [false, false, true] },
      { label: "On-prem / VPC deployment", values: [false, false, true] },
      { label: "Support", values: ["Community", "Email", "24/7 + CSM"] },
    ],
  },
];

const integrations = [
  { name: "Slack", slug: "slack" },
  { name: "Salesforce", slug: "salesforce" },
  { name: "HubSpot", slug: "hubspot" },
  { name: "Stripe", slug: "stripe" },
  { name: "QuickBooks", slug: "quickbooks" },
  { name: "Xero", slug: "xero" },
  { name: "SAP", slug: "sap" },
  { name: "Notion", slug: "notion" },
  { name: "Jira", slug: "jira" },
  { name: "Asana", slug: "asana" },
  { name: "Zapier", slug: "zapier" },
  { name: "Google Sheets", slug: "googlesheets" },
  { name: "Gmail", slug: "gmail" },
  { name: "Dropbox", slug: "dropbox" },
  { name: "Google Drive", slug: "googledrive" },
  { name: "GitHub", slug: "github" },
];

const faqs = [
  {
    q: "When will Orgni be available?",
    a: "The execution engine is in active development. Request access and we will reach out with early access before public launch.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual plans are billed once a year and save you roughly two months compared to paying monthly. You can switch between monthly and annual at any time.",
  },
  {
    q: "What counts as a workflow run?",
    a: "A run is a single execution of a detected workflow, from trigger to completion. Concurrent run limits apply per month and reset at the start of each billing cycle.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. You can upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    q: "Is my business data used to train models?",
    a: "No. Your sources and extracted context stay private to your organization and are never used to train shared models.",
  },
  {
    q: "Do you offer a free plan?",
    a: "Yes. The Developer plan is free forever for building and testing integrations, with no credit card required.",
  },
];

function renderCell(value: Cell) {
  if (value === true) {
    return <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />;
  }
  if (value === false) {
    return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

export default function Pricing() {
  const { open } = useWaitlist();
  const [billing, setBilling] = useState<Billing>("monthly");
  useSeo({
    title: "Pricing - Orgni",
    description:
      "Simple, transparent Orgni pricing. Start free with the Developer plan and scale to Production when you're ready to put business context into execution.",
    path: "/pricing",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <SiteHeader />

      <main className="flex-1 overflow-hidden">
        {/* Hero */}
        <section className="container max-w-screen-xl px-4 md:px-8 pt-16 md:pt-24 pb-8 md:pb-10 mx-auto text-center">
          <div className="font-mono text-xs font-bold text-primary mb-4">PRICING / PREVIEW</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 max-w-3xl mx-auto">
            Enterprise execution, predictable scale.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            The execution engine is in active development. Here's how pricing will work at launch. Request access to lock in early access.
          </p>
        </section>

        {/* Billing toggle */}
        <section className="container max-w-5xl px-4 md:px-8 mx-auto flex justify-center">
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex items-center gap-1 border border-border rounded-sm p-1 bg-card"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              aria-pressed={billing === "monthly"}
              className={`font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              aria-pressed={billing === "annual"}
              className={`inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                  billing === "annual" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                }`}
              >
                Save 17%
              </span>
            </button>
          </div>
        </section>

        {/* Plan cards */}
        <section className="container max-w-5xl px-4 md:px-8 pt-8 md:pt-10 pb-16 md:pb-20 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
            {plans.map((plan, i) => {
              const featured = plan.featured;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="h-full"
                >
                  <Card
                    className={`p-6 md:p-8 rounded-sm flex flex-col h-full relative ${
                      featured
                        ? "bg-foreground text-background border-foreground shadow-xl md:-mt-3 md:mb-3"
                        : "bg-card border-border shadow-sm"
                    }`}
                  >
                    {featured && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-mono font-bold px-3 py-1 rounded-sm uppercase tracking-wider whitespace-nowrap">
                        Recommended
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-mono text-sm font-bold uppercase text-primary">{plan.name}</h3>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider ${
                          featured ? "text-background/70" : "text-muted-foreground/70"
                        }`}
                      >
                        {plan.bestFor}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight tabular-nums">{plan.price[billing]}</span>
                      {plan.period && (
                        <span className={`text-base font-normal ${featured ? "text-background/60" : "text-muted-foreground"}`}>
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <p className={`font-mono text-[11px] mt-1.5 ${featured ? "text-background/70" : "text-muted-foreground"}`}>
                      {plan.note[billing]}
                    </p>
                    <p className={`text-sm mt-3 ${featured ? "text-background/70" : "text-muted-foreground"}`}>{plan.blurb}</p>

                    <div className={`mt-6 pt-6 border-t ${featured ? "border-background/15" : "border-border"}`}>
                      {plan.highlightsLead && (
                        <p
                          className={`font-mono text-[11px] font-bold uppercase tracking-wider mb-3 ${
                            featured ? "text-background/70" : "text-muted-foreground"
                          }`}
                        >
                          {plan.highlightsLead}
                        </p>
                      )}
                      <ul className="space-y-2.5">
                        {plan.highlights.map((h) => (
                          <li key={h} className="flex gap-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className={featured ? "text-background/90" : "text-foreground"}>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8 pt-2">
                      <Button
                        variant={plan.variant}
                        onClick={open}
                        className={`w-full rounded-sm ${
                          featured
                            ? "bg-[hsl(0_0%_92%)] text-[hsl(0_0%_12%)] border border-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_87%)]"
                            : plan.variant === "default"
                              ? "bg-primary hover:bg-primary/90"
                              : ""
                        }`}
                      >
                        {plan.cta}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include the Orgni context layer. Prices in ZAR, excl. VAT. No credit card required to join.
          </p>
        </section>

        {/* Comparison table */}
        <section className="bg-muted border-y border-border py-16 md:py-24">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="max-w-2xl mb-10 md:mb-14">
              <div className="font-mono text-xs font-bold text-primary mb-4">COMPARE PLANS</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything that's included.</h2>
              <p className="text-lg text-muted-foreground">
                A full breakdown of context, execution, finance, and governance across every tier.
              </p>
            </div>

            <div className="bg-background border border-border rounded-sm shadow-sm overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-sm font-bold p-4 md:p-5 w-2/5">Features</th>
                    {plans.map((plan) => (
                      <th
                        key={plan.name}
                        className={`text-center text-sm font-bold p-4 md:p-5 ${plan.featured ? "text-primary" : ""}`}
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureGroups.map((grp) => (
                    <Fragment key={grp.group}>
                      <tr className="bg-muted/50">
                        <td colSpan={4} className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 md:px-5 py-2.5">
                          {grp.group}
                        </td>
                      </tr>
                      {grp.rows.map((row) => (
                        <tr key={row.label} className="border-b border-border/60 last:border-0">
                          <td className="text-sm p-4 md:p-5">{row.label}</td>
                          {row.values.map((v, idx) => (
                            <td
                              key={idx}
                              className={`text-center p-4 md:p-5 align-middle ${
                                plans[idx]?.featured ? "bg-primary/5" : ""
                              }`}
                            >
                              {renderCell(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="py-16 md:py-24 border-b border-border">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="max-w-2xl mb-10 md:mb-14">
              <div className="font-mono text-xs font-bold text-primary mb-4">INTEGRATIONS</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Connects to the tools you run on.</h2>
              <p className="text-lg text-muted-foreground">
                Pull context from your existing systems and push execution back. Available on Production and Enterprise.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-border border border-border rounded-sm overflow-hidden">
              {integrations.map((it) => (
                <div
                  key={it.slug}
                  className="group flex items-center gap-3 bg-background p-5 md:p-6 hover:bg-muted/40 transition-colors"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white p-2 shadow-sm ring-1 ring-black/5">
                    <img
                      src={`${import.meta.env.BASE_URL}integrations/${it.slug}.svg`}
                      alt={`${it.name} logo`}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="text-sm font-medium truncate">{it.name}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Need something custom? Enterprise includes bespoke integrations and on-prem connectors.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-24 border-b border-border">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-10 lg:gap-16">
            <div>
              <div className="font-mono text-xs font-bold text-primary mb-4">FAQ</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Questions, answered.</h2>
              <p className="text-base text-muted-foreground">
                Still unsure? {" "}
                <button
                  onClick={open}
                  className="text-primary font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Request access
                </button>{" "}
                and we will help you find the right fit.
              </p>
            </div>

            <Accordion type="single" collapsible className="border-t border-border">
              {faqs.map((f, i) => (
                <AccordionItem key={f.q} value={`item-${i}`} className="border-b border-border">
                  <AccordionTrigger className="text-left text-[15px] font-semibold py-5 hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[15px] text-muted-foreground leading-7 pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-background py-20 md:py-28">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="relative overflow-hidden border border-border bg-card rounded-sm py-16 md:py-24 px-6 text-center max-w-3xl mx-auto">
              <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:48px_48px]"></div>
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">Ready to put your business context to work?</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button size="lg" onClick={open} className="w-full sm:w-auto rounded-sm bg-[hsl(0_0%_92%)] text-[hsl(0_0%_12%)] border border-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_87%)] h-14 px-8 text-base font-bold">
                  Try it for free
                  </Button>
                  <Button size="lg" variant="outline" onClick={open} className="w-full sm:w-auto rounded-sm h-14 px-8 border-border text-foreground hover:bg-foreground hover:text-background bg-transparent text-base font-medium">
                    Talk to Sales
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

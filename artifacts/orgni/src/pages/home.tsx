import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, Database, FileText, CheckCircle2, AlertCircle, FileSearch, ShieldCheck, Network, Clock, CircleDashed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useWaitlist } from "@/components/waitlist-dialog";
import { useSeo } from "@/hooks/use-seo";
import architectureImg from "@assets/image_1781491088810_cropped.png";

const successStories = [
  {
    sector: "Logistics",
    quote: "Orgni gave our automation the operating context it was missing. Routing decisions now follow our actual approval rules.",
    metric: "63% faster",
    name: "Marcus Hale",
    role: "VP Operations",
    company: "Northbound Freight",
  },
  {
    sector: "Financial Services",
    quote: "Every action now carries a provable trail. Our auditors stopped asking how the AI reached a decision.",
    metric: "100% audited",
    name: "Priya Nair",
    role: "Head of Compliance",
    company: "Meridian Capital",
  },
  {
    sector: "Manufacturing",
    quote: "We connected legacy ERP data to modern execution without rebuilding anything. Context stays live as our processes change.",
    metric: "40% less manual work",
    name: "Daniel Okoro",
    role: "Director of Operations",
    company: "Forge Industries",
  },
  {
    sector: "Healthcare",
    quote: "Scattered policies became one source of truth. Our teams and AI systems finally work from the same rules.",
    metric: "1 source of truth",
    name: "Elena Vasquez",
    role: "Chief Operating Officer",
    company: "Caregrid Health",
  },
  {
    sector: "Retail",
    quote: "Exceptions used to break our automation. Now Orgni knows what matters and execution adapts safely.",
    metric: "5x throughput",
    name: "Tom Becker",
    role: "Head of Fulfillment",
    company: "Loop Commerce",
  },
];

const tools = [
  {
    name: "Orgni Workflows",
    badge: "W",
    logo: "orgni-workflow.png",
    tagline: "Operational execution, wired to your rules.",
    desc: "Route tasks, approvals, handovers, and escalations through the rules, roles, and exceptions Orgni already knows.",
    href: "https://workflow.olyxee.com",
    features: ["Tasks & assignments", "Approvals", "Handovers", "Escalations", "Status updates", "Next actions"],
    preview: {
      title: "execution.log",
      rows: [
        { label: "Invoice approval routed to Finance Lead", tag: "Approved", tone: "ok" },
        { label: "Vendor onboarding assigned to Ops", tag: "In progress", tone: "active" },
        { label: "Refund over $5k escalated to Director", tag: "Escalated", tone: "warn" },
        { label: "Contract handover queued for Legal", tag: "Queued", tone: "muted" },
      ],
    },
  },
  {
    name: "Orgni Finance",
    badge: "F",
    logo: "orgni-finance.png",
    tagline: "Reconciliation with evidence and a clear trail.",
    desc: "Match statements to your ledger, flag exceptions, and keep source evidence on every line with a full audit trail.",
    href: "https://finance.olyxee.com",
    features: ["Statement vs. ledger", "Matched items", "Exceptions flagged", "Source evidence", "Review queue", "Audit trail"],
    preview: {
      title: "reconciliation.log",
      rows: [
        { label: "ACH #4821 matched to ledger entry", tag: "Matched", tone: "ok" },
        { label: "Wire #2290 amount mismatch", tag: "Exception", tone: "warn" },
        { label: "Card batch 06-14 reconciled", tag: "Matched", tone: "ok" },
        { label: "Unknown deposit flagged for review", tag: "Review", tone: "active" },
      ],
    },
  },
];

const TONES = {
  warn: {
    icon: AlertCircle,
    iconWrap: "bg-primary text-primary-foreground",
    tag: "bg-primary text-primary-foreground",
    spin: false,
  },
  active: {
    icon: Loader2,
    iconWrap: "bg-primary/15 text-primary",
    tag: "border border-primary/50 text-primary",
    spin: true,
  },
  ok: {
    icon: CheckCircle2,
    iconWrap: "bg-white/10 text-white/85",
    tag: "border border-white/20 text-white/70",
    spin: false,
  },
  muted: {
    icon: CircleDashed,
    iconWrap: "bg-white/[0.06] text-white/40",
    tag: "border border-white/10 text-white/40",
    spin: false,
  },
} as const;

export default function Home() {
  const { open } = useWaitlist();
  const [activeTool, setActiveTool] = useState(0);
  useSeo({
    title: "Orgni - Business context for AI execution",
    description:
      "Orgni is the business-context layer for AI-enabled execution. It learns your processes, rules, roles, documents, and exceptions so AI and your tools can act on real business context, safely, with a full evidence trail.",
    path: "/",
  });
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const earthScale = useTransform(scrollYProgress, [0, 1], [1.7, 1]);
  const earthOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0.6]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const keepPlaying = () => {
      if (document.visibilityState === "visible" && v.paused) {
        v.play().catch(() => {});
      }
    };
    keepPlaying();
    v.addEventListener("pause", keepPlaying);
    document.addEventListener("visibilitychange", keepPlaying);
    return () => {
      v.removeEventListener("pause", keepPlaying);
      document.removeEventListener("visibilitychange", keepPlaying);
    };
  }, []);

  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      let tries = 0;
      const tick = () => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
        else if (tries++ < 40) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <SiteHeader dark />

      <main className="flex-1 overflow-hidden">
        {/* Hero Section */}
        <section ref={heroRef} className="bg-black text-white relative overflow-hidden">
          <div className="container max-w-screen-xl px-4 md:px-8 pt-20 md:pt-32 pb-24 md:pb-40 mx-auto relative z-10">
            <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-20 text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter"
              >
                Business context for <br className="hidden md:block"/> AI execution.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative z-20 text-lg sm:text-xl md:text-2xl text-white/70 max-w-3xl px-4"
              >
                Orgni learns your processes, rules, roles, documents, and exceptions so AI can support real business work.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative z-20 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <a href="/app/" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-base font-bold">Try it</Button>
                </a>
                <Button size="lg" variant="outline" onClick={open} className="w-full sm:w-auto rounded-sm h-14 px-8 border-white/30 text-white hover:bg-white hover:text-black bg-transparent text-base font-medium">Join the waitlist</Button>
              </motion.div>

              {/* Earth video - blended into the black background, zooms on scroll.
                  Sits behind the heading (z-0 vs z-20) so a scaled-up video never obstructs the text. */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.4 }}
                className="w-full mt-16 md:mt-24 relative z-0 aspect-video md:aspect-[21/9]"
              >
                <motion.div
                  style={{ scale: earthScale, opacity: earthOpacity }}
                  className="absolute inset-0"
                >
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    src={`${import.meta.env.BASE_URL}hero.mp4`}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Operating Map Section */}
        <section className="border-t border-white/10 py-16 md:py-24 bg-black scroll-mt-20" id="product">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="max-w-2xl mb-10 md:mb-12">
              <div className="font-mono text-xs font-bold text-white/50 mb-4">THE OPERATING MAP</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Inputs in, structured execution out.</h2>
              <p className="text-lg text-white/60">Orgni reads your sources and maps them into a live operating model your tools and AI systems can act on safely.</p>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full relative border border-white/10 bg-black text-neutral-900 py-16 px-4 sm:p-8 aspect-auto md:aspect-[2/1] min-h-[500px] md:max-h-[600px] overflow-hidden flex flex-col items-center justify-center shadow-lg rounded-sm"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

              {/* Live label */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest text-white/80">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                LIVE MAP
              </div>

              <div className="relative z-10 w-full max-w-3xl flex flex-col md:flex-row justify-between items-center gap-12 md:gap-0">
                
                {/* Inputs Column */}
                <div className="flex flex-col gap-4 md:gap-6 w-full items-center md:items-start md:w-auto">
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 transition-all hover:border-primary/60 rounded-sm">
                    <FileText className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="font-mono text-xs truncate">Policies</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 md:ml-8 transition-all hover:border-primary/60 rounded-sm">
                    <Database className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="font-mono text-xs truncate">ERP Data</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 transition-all hover:border-primary/60 rounded-sm">
                    <FileSearch className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="font-mono text-xs truncate">Contracts</span>
                  </div>
                </div>

                {/* Core */}
                <div className="shrink-0 h-24 w-24 md:h-32 md:w-32 bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 relative group my-4 md:my-0 rounded-sm">
                  <div className="absolute inset-0 border border-primary/50 animate-ping rounded-none"></div>
                  <img src={`${import.meta.env.BASE_URL}orgni-logo.png`} alt="Orgni" className="h-12 w-12 md:h-16 md:w-16 object-contain grayscale" />
                  <span className="absolute -bottom-8 font-mono text-[10px] md:text-sm font-bold text-white whitespace-nowrap bg-black/40 px-2 py-0.5 rounded md:bg-transparent md:px-0">ORGNI CORE</span>
                  
                  {/* Connectors (visible only on desktop) */}
                  <div className="hidden md:block absolute top-1/2 -left-12 w-12 h-px bg-white/20"></div>
                  <div className="hidden md:block absolute top-1/2 -right-12 w-12 h-px bg-white/20"></div>
                </div>

                {/* Outputs Column */}
                <div className="flex flex-col gap-4 md:gap-6 w-full items-center md:items-end md:w-auto">
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 transition-all hover:border-primary/60 rounded-sm">
                    <Network className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs truncate">Workflow Exec</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 md:mr-8 transition-all hover:border-primary/60 rounded-sm">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs truncate">Finance Auth</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 transition-all hover:border-primary/60 rounded-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs truncate">Audit Record</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The Problem Section - Asymmetric Layout */}
        <section className="border-t border-white/10 py-16 md:py-24 relative bg-black">
          <div className="hidden md:block absolute left-12 lg:left-24 top-0 bottom-0 w-px bg-white/10"></div>
          <div className="container max-w-screen-xl px-4 md:px-12 lg:px-24 mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 md:gap-12 items-start">
              <div className="lg:sticky lg:top-24">
                <div className="font-mono text-xs font-bold text-white/50 mb-4">01 / CONTEXT GAP</div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">The Problem with Generic AI.</h2>
                <p className="text-lg text-white/60">AI models are smart, but they lack operational context. They don't know who approves what, where the data lives, or what exceptions matter.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                <div className="space-y-6 sm:mt-12">
                  <Card className="p-6 md:p-8 rounded-sm border-white/10 bg-white/5 text-white hover:bg-white/[0.07] transition-colors">
                    <div className="h-10 w-10 bg-white/10 flex items-center justify-center mb-6 rounded-sm">
                      <FileSearch className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-mono text-sm font-bold mb-3 uppercase">Knowledge is Scattered</h3>
                    <p className="text-white/60 leading-relaxed text-sm md:text-base">Critical business rules live in wikis, chats, and people's heads. AI cannot reliably execute without an authoritative source of truth for your operating procedures.</p>
                  </Card>
                  <Card className="p-6 md:p-8 rounded-sm border-white/10 bg-white/5 text-white hover:bg-white/[0.07] transition-colors">
                    <div className="h-10 w-10 bg-white/10 flex items-center justify-center mb-6 rounded-sm">
                      <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-mono text-sm font-bold mb-3 uppercase">No Audit Trail</h3>
                    <p className="text-white/60 leading-relaxed text-sm md:text-base">Generic agents take actions without explainable financial context. Enterprise execution requires provable logs of exactly why and how an AI made a decision.</p>
                  </Card>
                </div>
                
                <div className="space-y-6">
                  <Card className="p-6 md:p-8 rounded-sm border-white/10 bg-white/5 text-white hover:bg-white/[0.07] transition-colors border-t-4 border-t-primary">
                    <div className="h-10 w-10 bg-primary/10 flex items-center justify-center mb-6 rounded-sm">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-mono text-sm font-bold mb-3 uppercase text-primary">Legacy Friction</h3>
                    <p className="text-white/60 leading-relaxed text-sm md:text-base">Old systems are hard to connect to modern execution models. The gap between your ERP and your AI agents creates manual bottlenecks that defeat the purpose of automation.</p>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layered Architecture Section */}
        <section className="bg-black text-white py-16 md:py-24 border-t border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 md:gap-16 items-center">
              <div className="max-w-xl">
                <div className="font-mono text-xs font-bold text-white/50 mb-4">THE STACK</div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
                  Three layers, one <span className="text-primary">context engine</span>.
                </h2>
                <div className="flex flex-col gap-6 mt-8">
                  <div className="border-l-2 border-white/20 pl-4">
                    <div className="font-mono text-xs font-bold uppercase tracking-widest text-white mb-1">Build Experience</div>
                    <p className="text-sm md:text-base text-white/60 leading-relaxed">The surface your teams and AI systems work through.</p>
                  </div>
                  <div className="border-l-2 border-white/20 pl-4">
                    <div className="font-mono text-xs font-bold uppercase tracking-widest text-white mb-1">Context Model</div>
                    <p className="text-sm md:text-base text-white/60 leading-relaxed">Your rules, roles, and approvals mapped into a live operating model.</p>
                  </div>
                  <div className="border-l-2 border-white/20 pl-4">
                    <div className="font-mono text-xs font-bold uppercase tracking-widest text-white mb-1">Data Core</div>
                    <p className="text-sm md:text-base text-white/60 leading-relaxed">Connected sources feeding structured truth into every action.</p>
                  </div>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <img src={architectureImg} alt="Orgni layered architecture: Build Experience, Context Model, and Data Core connected through APIs" className="w-full h-auto object-contain" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Tools Section - Products built on Orgni context */}
        <section className="py-16 md:py-24 border-b border-white/10 bg-black scroll-mt-20" id="tools">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="max-w-2xl mb-10 md:mb-16">
              <div className="font-mono text-xs font-bold text-white/50 mb-4">03 / TOOLS</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Tools that run on your context.</h2>
              <p className="text-lg md:text-xl text-white/60">
                Orgni's context layer powers focused products. Each one acts with your rules, roles, approvals, and audit trail already built in.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-stretch">
              {/* Selector */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {tools.map((tool, i) => {
                  const active = i === activeTool;
                  return (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => setActiveTool(i)}
                      aria-pressed={active}
                      className={`text-left border rounded-sm p-5 md:p-6 transition-all ${active ? "border-primary bg-white/10 shadow-md" : "border-white/10 bg-white/5 hover:border-primary/50"}`}
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={`${import.meta.env.BASE_URL}${tool.logo}`}
                          alt={`${tool.name} logo`}
                          className="h-11 w-11 md:h-12 md:w-12 rounded-lg object-contain shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg md:text-xl font-bold tracking-tight">{tool.name}</h3>
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/60"}`}>{tool.badge}</span>
                          </div>
                          <p className="text-sm text-white/60 mt-0.5">{tool.tagline}</p>
                        </div>
                        <ArrowRight className={`h-5 w-5 shrink-0 transition-all ${active ? "text-primary translate-x-0" : "text-white/30 -translate-x-1"}`} />
                      </div>
                    </button>
                  );
                })}

                <div className="hidden lg:block border border-white/10 rounded-sm p-5 bg-white/5 mt-1">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tools[activeTool].name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm text-white/60 leading-relaxed"
                    >
                      {tools[activeTool].desc}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Live preview console */}
              <div className="lg:col-span-3">
                {/* MacBook-style preview */}
                <div className="relative">
                  {/* Screen */}
                  <div className="rounded-[1.4rem] border border-white/15 bg-gradient-to-b from-neutral-800 to-neutral-900 p-2.5 shadow-2xl shadow-black/60">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
                      {/* Notch / camera housing */}
                      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 z-30 flex h-5 w-32 -translate-x-1/2 items-center justify-center gap-2 rounded-b-2xl bg-black">
                        <span className="h-1 w-1 rounded-full bg-white/25"></span>
                      </div>

                      {/* Title bar (macOS) */}
                      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full bg-white/15"></span>
                          <span className="h-3 w-3 rounded-full bg-white/15"></span>
                          <span className="h-3 w-3 rounded-full bg-primary"></span>
                        </div>
                        <div className="flex flex-1 justify-center">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={tools[activeTool].preview.title}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="rounded-md bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/45"
                            >
                              {tools[activeTool].preview.title}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                        <span className="h-3 w-3 shrink-0" aria-hidden="true"></span>
                      </div>

                      {/* App header */}
                      <div className="flex items-center justify-between gap-3 px-4 md:px-5 pt-4 pb-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={`${import.meta.env.BASE_URL}${tools[activeTool].logo}`}
                            alt={`${tools[activeTool].name} logo`}
                            className="h-9 w-9 shrink-0 rounded-xl object-contain ring-1 ring-white/10"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold">{tools[activeTool].name}</div>
                            <div className="font-mono text-[10px] text-white/40">{tools[activeTool].preview.rows.length} live events</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold text-primary">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
                            </span>
                            LIVE
                          </span>
                          <a
                            href={tools[activeTool].href}
                            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] font-bold text-white/70 transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            Open<ArrowRight className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      {/* Event rows */}
                      <div className="px-4 md:px-5">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={tools[activeTool].name}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="flex flex-col gap-2"
                          >
                            {tools[activeTool].preview.rows.map((row, ri) => {
                              const tone = TONES[row.tone as keyof typeof TONES] ?? TONES.muted;
                              const Icon = tone.icon;
                              return (
                                <motion.div
                                  key={row.label}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.25, delay: ri * 0.06 }}
                                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
                                >
                                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.iconWrap}`}>
                                    <Icon className={`h-3.5 w-3.5 ${tone.spin ? "animate-spin" : ""}`} />
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-sm text-white/85">{row.label}</span>
                                  <span className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${tone.tag}`}>
                                    {row.tag}
                                  </span>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Toolbar / feature chips */}
                      <div className="mt-4 border-t border-white/10 bg-white/[0.02] px-4 md:px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {tools[activeTool].features.map((f) => (
                            <span key={f} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/55">{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Laptop base / hinge */}
                  <div aria-hidden="true" className="relative h-3.5">
                    <div className="absolute left-1/2 top-0 h-full w-[112%] -translate-x-1/2 rounded-b-2xl bg-gradient-to-b from-neutral-600 via-neutral-800 to-neutral-950 shadow-xl shadow-black/50"></div>
                    <div className="absolute left-1/2 top-0 h-1.5 w-28 -translate-x-1/2 rounded-b-lg bg-neutral-950/90"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Success Stories Section */}
        <section className="bg-black text-white py-16 md:py-24 border-t border-white/10 relative overflow-hidden" id="stories">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto relative z-10">
            <div className="max-w-2xl mb-10 md:mb-12">
              <div className="font-mono text-xs font-bold text-white/50 mb-4">SUCCESS STORIES</div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                Built for teams that <span className="text-primary">execute</span>.
              </h2>
            </div>

            <Carousel
              opts={{ align: "start", loop: true }}
              plugins={[
                Autoplay({
                  delay: 4000,
                  stopOnInteraction: false,
                  stopOnMouseEnter: true,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {successStories.map((story) => (
                  <CarouselItem key={story.company} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <div className="h-full flex flex-col justify-between border border-white/15 bg-white/5 p-6 md:p-8 rounded-sm hover:border-primary/60 transition-colors">
                      <div>
                        <div className="font-mono text-xs font-bold uppercase tracking-widest text-white/50 mb-4">{story.sector}</div>
                        <p className="text-base md:text-lg text-white/90 leading-relaxed mb-6">"{story.quote}"</p>
                      </div>
                      <div className="border-t border-white/15 pt-5">
                        <div className="text-3xl md:text-4xl font-bold tracking-tight text-primary mb-3">{story.metric}</div>
                        <div className="font-mono text-sm font-bold">{story.name}</div>
                        <div className="font-mono text-xs text-white/50">{story.role}, {story.company}</div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex items-center justify-between mt-8">
                <div className="font-mono text-xs text-white/40">Slide to see more</div>
                <div className="flex items-center gap-3">
                  <CarouselPrevious className="static translate-y-0 h-10 w-10 rounded-sm border-white/20 bg-transparent text-white hover:bg-primary hover:text-primary-foreground hover:border-primary" />
                  <CarouselNext className="static translate-y-0 h-10 w-10 rounded-sm border-white/20 bg-transparent text-white hover:bg-primary hover:text-primary-foreground hover:border-primary" />
                </div>
              </div>
            </Carousel>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-black py-20 md:py-28" id="solutions">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="relative overflow-hidden border border-white/10 bg-white/5 rounded-sm py-16 md:py-24 px-6 text-center max-w-4xl mx-auto">
              <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:48px_48px]"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1 rounded-sm mb-6 md:mb-8">
                  <span className="h-2 w-2 bg-primary rounded-full animate-pulse shrink-0"></span>
                  <span className="font-mono text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-widest">Engine in development</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-8">Turn business knowledge into execution infrastructure.</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 md:mt-12 px-4">
                  <a href="/app/" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-base font-bold">Try it</Button>
                  </a>
                  <Button size="lg" variant="outline" onClick={open} className="w-full sm:w-auto rounded-sm h-14 px-8 border-white/30 text-white hover:bg-white hover:text-black bg-transparent text-base font-medium">Join the waitlist</Button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter dark />
    </div>
  );
}

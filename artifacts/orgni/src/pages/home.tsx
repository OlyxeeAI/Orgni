import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect } from "react";
import {
  ArrowRight,
  FileText,
  Workflow,
  GitCommitHorizontal,
  Database,
  Network,
  History,
  ShieldCheck,
  Banknote,
  Truck,
  Activity,
  BookOpen,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useWaitlist } from "@/components/waitlist-dialog";
import { useSeo } from "@/hooks/use-seo";
import architectureImg from "@assets/image_1781491088810_cropped.png";

const capabilities = [
  {
    name: "Knowledge",
    icon: FileText,
    desc: "Documents, policies, records, notes, and internal knowledge.",
  },
  {
    name: "Processes",
    icon: Workflow,
    desc: "How work moves across teams, systems, and approvals.",
  },
  {
    name: "Decisions",
    icon: GitCommitHorizontal,
    desc: "What was decided, why, by whom, and with what evidence.",
  },
  {
    name: "Systems",
    icon: Database,
    desc: "The tools, data, and records your operations depend on.",
  },
];

const comparison = {
  static: [
    "Documents stored somewhere",
    "Answers without memory",
    "Scattered decisions",
    "Manual process understanding",
    "AI that guesses",
  ],
  live: [
    "Knowledge connected to operations",
    "Context that improves over time",
    "Traceable decision history",
    "Structured operating logic",
    "Intelligent systems with business context",
  ],
};

const modules = [
  {
    name: "Context",
    icon: Network,
    desc: "Structure company knowledge into usable business context.",
  },
  {
    name: "Memory",
    icon: History,
    desc: "Capture decisions, changes, outcomes, and operating history.",
  },
  {
    name: "Operations",
    icon: Workflow,
    desc: "Connect context to real processes, teams, and systems.",
  },
  {
    name: "Controls",
    icon: ShieldCheck,
    desc: "Define what intelligent systems can access, suggest, or act on.",
  },
];

const useCases = [
  {
    name: "Finance",
    icon: Banknote,
    desc: "Reconcile records, understand decisions, and maintain financial context.",
  },
  {
    name: "Logistics",
    icon: Truck,
    desc: "Connect shipments, suppliers, documents, exceptions, and customer updates.",
  },
  {
    name: "Operations",
    icon: Activity,
    desc: "Give teams a live view of how work actually moves.",
  },
  {
    name: "Knowledge",
    icon: BookOpen,
    desc: "Make company knowledge usable beyond search.",
  },
];

export default function Home() {
  const { open } = useWaitlist();
  useSeo({
    title: "Orgni - Live business context for modern operations",
    description:
      "Orgni maps how a business works - its knowledge, processes, decisions, and systems - into a living context layer so intelligent tools can operate with the right context. Built by Olyxee.",
    path: "/",
  });
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const earthOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0.6]);
  // The whole video frame starts enlarged (full globe visible, just bigger) and
  // eases back to its natural size as the user scrolls down through the hero.
  const videoScale = useTransform(scrollYProgress, [0, 0.6], [1.3, 1]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

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
    v.addEventListener("canplay", keepPlaying);
    v.addEventListener("loadeddata", keepPlaying);
    document.addEventListener("visibilitychange", keepPlaying);
    return () => {
      v.removeEventListener("pause", keepPlaying);
      v.removeEventListener("canplay", keepPlaying);
      v.removeEventListener("loadeddata", keepPlaying);
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
        {/* 1. Hero Section */}
        <section ref={heroRef} className="bg-black text-white relative">
          <div className="container max-w-screen-xl px-4 md:px-8 pt-20 md:pt-32 pb-0 mx-auto relative z-10">
            <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-20 text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter"
              >
                Live business context <br className="hidden md:block" /> for modern operations.
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative z-20 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button
                  size="lg"
                  onClick={open}
                  className="w-full sm:w-auto rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-base font-bold"
                >
                  Try it for free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToId("what")}
                  className="w-full sm:w-auto rounded-sm h-14 px-8 border-white/30 text-white hover:bg-white hover:text-black bg-transparent text-base font-medium"
                >
                  Explore Orgni
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="relative z-20 font-mono text-xs md:text-sm text-white/40 max-w-xl"
              >
                Built by Olyxee, a research and infrastructure company for operational intelligence.
              </motion.p>

              {/* Earth video - blended into the black background, fades on scroll.
                  Sits behind the heading (z-0 vs z-20) so it never obstructs the text. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.4 }}
                style={{ scale: videoScale, transformOrigin: "center center" }}
                className="w-full mt-16 md:mt-24 -mb-12 sm:-mb-16 md:-mb-24 relative z-0 aspect-square sm:aspect-video md:aspect-[16/9] will-change-transform"
              >
                <motion.div
                  style={{ opacity: earthOpacity }}
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
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-black" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* 2. Problem Section */}
        <section className="py-20 md:py-28 relative z-10 overflow-hidden">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto relative">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 md:gap-16 items-start">
              <div>
                <div className="font-mono text-xs font-bold text-white/50 mb-4"><span className="text-primary">01</span> / THE GAP</div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                  Your business changes faster than your systems understand.
                </h2>
              </div>
              <div className="space-y-6 text-lg text-white/60 leading-relaxed lg:pt-2">
                <p>
                  Company knowledge lives across documents, chats, spreadsheets, tools, and people. Decisions are made every day, but the context behind them is rarely captured. Processes change, responsibilities shift, and teams lose operational memory.
                </p>
                <p className="text-white border-l-2 border-primary pl-5">
                  Orgni creates a live context layer that keeps your business understandable as it operates.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. What Orgni does Section */}
        <section className="border-t border-white/10 py-16 md:py-24 bg-black scroll-mt-20" id="what">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="max-w-2xl mb-10 md:mb-12">
              <div className="font-mono text-xs font-bold text-white/50 mb-4"><span className="text-primary">02</span> / WHAT ORGNI DOES</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Orgni maps the operating context of your business.
              </h2>
              <p className="text-lg text-white/60">
                Orgni reads your sources and maps them into a live operating model your teams and intelligent systems can rely on.
              </p>
            </div>

            {/* Operating map visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full relative border border-white/10 bg-black py-16 px-4 sm:p-8 aspect-auto md:aspect-[2/1] min-h-[480px] md:max-h-[560px] overflow-hidden flex flex-col items-center justify-center shadow-lg rounded-sm mb-10 md:mb-14"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest text-white/80">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                LIVE CONTEXT
              </div>

              <div className="relative z-10 w-full max-w-3xl flex flex-col md:flex-row justify-between items-center gap-12 md:gap-0">
                {/* Inputs Column */}
                <div className="flex flex-col gap-4 md:gap-6 w-full items-center md:items-start md:w-auto">
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 transition-all hover:border-primary/60 rounded-sm text-neutral-900">
                    <FileText className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="font-mono text-xs truncate">Documents</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 md:ml-8 transition-all hover:border-primary/60 rounded-sm text-neutral-900">
                    <Database className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="font-mono text-xs truncate">Systems</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 transition-all hover:border-primary/60 rounded-sm text-neutral-900">
                    <GitCommitHorizontal className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="font-mono text-xs truncate">Decisions</span>
                  </div>
                </div>

                {/* Core */}
                <div className="shrink-0 h-24 w-24 md:h-32 md:w-32 bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 relative group my-4 md:my-0 rounded-sm">
                  <div className="absolute inset-0 border border-primary/50 animate-ping rounded-none"></div>
                  <img src={`${import.meta.env.BASE_URL}orgni-logo.png`} alt="Orgni" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
                  <span className="absolute -bottom-8 font-mono text-[10px] md:text-sm font-bold text-white whitespace-nowrap bg-black/40 px-2 py-0.5 rounded md:bg-transparent md:px-0">ORGNI</span>

                  <div className="hidden md:block absolute top-1/2 -left-12 w-12 h-px bg-white/20"></div>
                  <div className="hidden md:block absolute top-1/2 -right-12 w-12 h-px bg-white/20"></div>
                </div>

                {/* Outputs Column */}
                <div className="flex flex-col gap-4 md:gap-6 w-full items-center md:items-end md:w-auto">
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 transition-all hover:border-primary/60 rounded-sm text-neutral-900">
                    <Network className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs truncate">Live context</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 md:mr-8 transition-all hover:border-primary/60 rounded-sm text-neutral-900">
                    <Workflow className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs truncate">Operating model</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-black/10 p-3 px-4 shadow-lg w-full max-w-[240px] md:w-48 transition-all hover:border-primary/60 rounded-sm text-neutral-900">
                    <History className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs truncate">Traceable history</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Four pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {capabilities.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <Card className="group relative h-full p-6 md:p-8 rounded-sm border-white/10 bg-white/5 text-white hover:bg-white/[0.07] hover:border-white/20 transition-all overflow-hidden">
                      <span className="absolute top-0 left-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full"></span>
                      <span aria-hidden="true" className="absolute top-4 right-5 font-mono text-xs text-white/20 group-hover:text-primary/70 transition-colors select-none">0{i + 1}</span>
                      <div className="h-10 w-10 bg-white/10 flex items-center justify-center mb-6 rounded-sm group-hover:bg-primary/15 transition-colors">
                        <Icon className="h-5 w-5 text-white group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-mono text-sm font-bold mb-3 uppercase">{item.name}</h3>
                      <p className="text-white/60 leading-relaxed text-sm md:text-base">{item.desc}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Comparison Section */}
        <section className="border-t border-white/10 py-16 md:py-24 bg-black relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto relative z-10">
            <div className="max-w-2xl mb-10 md:mb-12">
              <div className="font-mono text-xs font-bold text-white/50 mb-4"><span className="text-primary">03</span> / THE SHIFT</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                From static knowledge to live operational context.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Static */}
              <Card className="p-6 md:p-8 rounded-sm border-white/10 bg-white/[0.03] text-white">
                <div className="font-mono text-xs font-bold uppercase tracking-widest text-white/50 mb-6">
                  Static knowledge
                </div>
                <ul className="space-y-4">
                  {comparison.static.map((row) => (
                    <li key={row} className="flex items-start gap-3 text-white/55">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-white/5 border border-white/10">
                        <X className="h-3 w-3 text-white/40" />
                      </span>
                      <span className="text-sm md:text-base leading-relaxed">{row}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Live */}
              <Card className="p-6 md:p-8 rounded-sm border-white/10 bg-white/[0.05] text-white border-t-4 border-t-primary">
                <div className="font-mono text-xs font-bold uppercase tracking-widest text-primary mb-6">
                  Live business context
                </div>
                <ul className="space-y-4">
                  {comparison.live.map((row) => (
                    <li key={row} className="flex items-start gap-3 text-white/85">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary/15 border border-primary/40">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      <span className="text-sm md:text-base leading-relaxed">{row}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* 5. Product Modules Section */}
        <section className="border-t border-white/10 py-16 md:py-24 bg-black scroll-mt-20 relative overflow-hidden" id="modules">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto relative">
            <div className="max-w-2xl mb-10 md:mb-12">
              <div className="font-mono text-xs font-bold text-white/50 mb-4"><span className="text-primary">04</span> / CAPABILITIES</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Orgni is one product. These are its capabilities.
              </h2>
              <p className="text-lg text-white/60 mt-4">
                A single live business context platform, not a suite of separate tools. Context, memory, operations, and controls work together inside Orgni.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {modules.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <Card className="group relative h-full p-6 md:p-8 rounded-sm border-white/10 bg-white/5 text-white hover:bg-white/[0.07] hover:border-primary/30 transition-all flex items-start gap-5 overflow-hidden">
                      <span aria-hidden="true" className="pointer-events-none absolute -bottom-5 right-1 font-mono text-7xl font-bold text-white/[0.04] group-hover:text-primary/10 transition-colors select-none">0{i + 1}</span>
                      <div className="h-11 w-11 shrink-0 bg-primary/10 flex items-center justify-center rounded-sm group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="relative">
                        <h3 className="text-lg md:text-xl font-bold tracking-tight mb-2">{mod.name}</h3>
                        <p className="text-white/60 leading-relaxed text-sm md:text-base">{mod.desc}</p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. Use Cases Section */}
        <section className="border-t border-white/10 py-16 md:py-24 bg-black scroll-mt-20" id="use-cases">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="max-w-2xl mb-10 md:mb-12">
              <div className="font-mono text-xs font-bold text-white/50 mb-4"><span className="text-primary">05</span> / USE CASES</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Built for operations where context matters.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((uc, i) => {
                const Icon = uc.icon;
                return (
                  <motion.div
                    key={uc.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <Card className="group relative h-full p-6 md:p-8 rounded-sm border-white/10 bg-white/5 text-white hover:bg-white/[0.07] transition-all overflow-hidden hover:-translate-y-1 duration-300">
                      <span className="absolute top-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-primary transition-transform duration-500 group-hover:scale-x-100"></span>
                      <div className="h-10 w-10 bg-white/10 flex items-center justify-center mb-6 rounded-sm group-hover:bg-primary/15 transition-colors">
                        <Icon className="h-5 w-5 text-white group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-mono text-sm font-bold mb-3 uppercase">{uc.name}</h3>
                      <p className="text-white/60 leading-relaxed text-sm md:text-base">{uc.desc}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. Why now Section */}
        <section className="bg-black text-white py-16 md:py-24 border-t border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 md:gap-16 items-center">
              <div className="max-w-xl">
                <div className="font-mono text-xs font-bold text-white/50 mb-4"><span className="text-primary">06</span> / WHY NOW</div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
                  Intelligence is getting stronger. <span className="text-primary">Context</span> is the bottleneck.
                </h2>
                <p className="text-lg text-white/60 leading-relaxed">
                  Modern AI can reason, write, code, plan, and use tools. But inside a company, intelligence is only useful when it understands the business. Orgni gives organizations the context layer needed for intelligent systems to support real operations.
                </p>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <img
                  src={architectureImg}
                  alt="Orgni context layer connecting business knowledge, processes, decisions, and systems to intelligent operations"
                  className="w-full h-auto object-contain"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* 8. Final CTA Section */}
        <section className="bg-black py-20 md:py-28 border-t border-white/10">
          <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
            <div className="relative overflow-hidden border border-white/10 bg-white/5 rounded-sm py-16 md:py-24 px-6 text-center max-w-4xl mx-auto">
              <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:48px_48px]"></div>
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  Build your business context layer.
                </h2>
                <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8 md:mb-10">
                  Orgni helps your organization become understandable to intelligent systems.
                </p>
                <div className="flex justify-center px-4">
                  <Button
                    size="lg"
                    onClick={open}
                    className="w-full sm:w-auto rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 text-base font-bold"
                  >
                    Try it for free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
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

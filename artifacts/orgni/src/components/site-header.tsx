import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Command, ChevronDown, Menu, X, Map, Workflow, Banknote, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWaitlist } from "@/components/waitlist-dialog";
import { useCommandPalette } from "@/components/command-palette";

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const { open } = useWaitlist();
  const { open: openSearch } = useCommandPalette();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dark (black) only while at the top of a dark-hero page; switches to light on scroll.
  const isDark = dark && !scrolled;

  const headerClass = isDark
    ? "sticky top-0 z-50 w-full bg-black text-white transition-colors duration-300"
    : "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300";
  const dividerClass = isDark ? "h-4 w-[1px] bg-white/20 hidden md:block" : "h-4 w-[1px] bg-border hidden md:block";
  const navTrigger = isDark
    ? "relative group px-3 py-2 flex items-center gap-1.5 cursor-pointer text-white hover:bg-white/10 transition-colors rounded-sm"
    : "relative group px-3 py-2 flex items-center gap-1.5 cursor-pointer text-foreground hover:bg-muted transition-colors rounded-sm";
  const navLink = isDark
    ? "px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-sm"
    : "px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-sm";
  const searchBox = isDark
    ? "group/search hidden lg:flex items-center gap-2 px-2 py-1.5 bg-white/10 border border-white/20 text-white/70 text-xs font-mono rounded-sm transition-all duration-200 hover:bg-white/20 hover:border-white/40 active:scale-95 cursor-pointer"
    : "group/search hidden lg:flex items-center gap-2 px-2 py-1.5 bg-muted border border-border/50 text-muted-foreground text-xs font-mono rounded-sm transition-all duration-200 hover:bg-muted hover:border-primary/50 hover:text-foreground active:scale-95 cursor-pointer";
  const searchIconBtn = isDark
    ? "lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-sm text-white hover:bg-white/10 transition-colors"
    : "lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-sm text-foreground hover:bg-muted transition-colors";
  const mobileToggle = isDark
    ? "md:hidden inline-flex items-center justify-center h-8 w-8 -mr-1 rounded-sm text-white hover:bg-white/10 transition-colors"
    : "md:hidden inline-flex items-center justify-center h-8 w-8 -mr-1 rounded-sm text-foreground hover:bg-muted transition-colors";
  const mobilePanel = isDark ? "md:hidden border-t border-white/10 bg-black text-white" : "md:hidden border-t border-border bg-background";
  const mobileLink = isDark ? "py-3 text-white" : "py-3 text-foreground";
  const mobileLinkBorder = isDark ? "border-b border-white/10" : "border-b border-border/60";

  return (
    <header className={headerClass}>
      <div className="flex h-14 items-center px-4 md:px-6 w-full justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}orgni-logo.png`} alt="Orgni logo" className="h-6 w-6 rounded object-cover" />
            <span className="font-mono font-bold tracking-tight text-base">ORGNI</span>
          </Link>

          <div className={dividerClass}></div>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <div className={navTrigger}>
              <span>Product</span>
              <ChevronDown className={isDark ? "h-3 w-3 text-white/60" : "h-3 w-3 text-muted-foreground"} />

              {/* Mega Menu Dropdown */}
              <div className="absolute top-full left-0 pt-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-background text-foreground border border-border shadow-xl p-2 rounded-none flex flex-col gap-1">
                  <Link href="/#product" className="p-2 hover:bg-muted transition-colors flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted text-primary">
                      <Map className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-bold">Business Map</span>
                      <span className="text-xs text-muted-foreground">Map your operational context</span>
                    </span>
                  </Link>
                  <a href="https://workflow.olyxee.com" className="p-2 hover:bg-muted transition-colors flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted text-primary">
                      <Workflow className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-bold">Orgni Workflows</span>
                      <span className="text-xs text-muted-foreground">Execution logic & routing</span>
                    </span>
                  </a>
                  <a href="https://finance.olyxee.com" className="p-2 hover:bg-muted transition-colors flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted text-primary">
                      <Banknote className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-bold">Orgni Finance</span>
                      <span className="text-xs text-muted-foreground">Financial context for AI agents</span>
                    </span>
                  </a>
                  <Link href="/#product" className="p-2 hover:bg-muted transition-colors flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted text-primary">
                      <ScrollText className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-bold">Audit Trail</span>
                      <span className="text-xs text-muted-foreground">Full transparency logging</span>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
            <Link href="/docs" className={navLink}>Docs</Link>
            <Link href="/api-reference" className={navLink}>API</Link>
            <Link href="/pricing" className={navLink}>Pricing</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button type="button" onClick={openSearch} className={searchBox} aria-label="Search">
            <Search className="h-3.5 w-3.5 transition-colors group-hover/search:text-primary" />
            <span>Search docs...</span>
            <div className="flex items-center gap-0.5 ml-4">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </button>
          <button type="button" onClick={openSearch} className={searchIconBtn} aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <div className={`${dividerClass} mx-1`}></div>
          <a href="/app/">
            <Button size="sm" variant="outline" className={isDark ? "rounded-sm text-xs h-8 px-4 font-bold border-white/30 text-white hover:bg-white hover:text-black bg-transparent" : "rounded-sm text-xs h-8 px-4 font-bold"}>Try it</Button>
          </a>
          <Button size="sm" className="rounded-sm text-xs h-8 px-4 font-bold bg-[hsl(0_0%_92%)] text-[hsl(0_0%_12%)] border border-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_87%)]" onClick={open}>Join waitlist</Button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
            className={mobileToggle}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <nav id="mobile-menu" className={mobilePanel}>
          <div className="flex flex-col px-4 py-3 text-sm font-medium">
            <Link href="/docs" onClick={closeMobile} className={`${mobileLink} ${mobileLinkBorder}`}>Docs</Link>
            <Link href="/api-reference" onClick={closeMobile} className={`${mobileLink} ${mobileLinkBorder}`}>API</Link>
            <Link href="/pricing" onClick={closeMobile} className={mobileLink}>Pricing</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

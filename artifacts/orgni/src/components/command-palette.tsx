import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  FileText,
  BookOpen,
  Code2,
  Tag,
  Home as HomeIcon,
} from "lucide-react";

type CommandPaletteContextValue = {
  open: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider",
    );
  }
  return ctx;
}

type Item = {
  id: string;
  title: string;
  group: string;
  path: string;
  hash?: string;
  keywords?: string;
  icon: typeof FileText;
};

const GROUP_ORDER = ["Pages", "Documentation", "API Reference"] as const;

const ITEMS: Item[] = [
  // Pages
  { id: "p-home", title: "Home", group: "Pages", path: "/", icon: HomeIcon, keywords: "landing start overview hero" },
  { id: "p-docs", title: "Documentation", group: "Pages", path: "/docs", icon: BookOpen, keywords: "docs guide help learn" },
  { id: "p-api", title: "API Reference", group: "Pages", path: "/api-reference", icon: Code2, keywords: "api rest json endpoints developers" },
  { id: "p-pricing", title: "Pricing", group: "Pages", path: "/pricing", icon: Tag, keywords: "plans cost price billing" },

  // Docs sections
  { id: "d-intro", title: "Introduction", group: "Documentation", path: "/docs", hash: "introduction", icon: FileText, keywords: "what is orgni overview" },
  { id: "d-how", title: "How it works", group: "Documentation", path: "/docs", hash: "how-it-works", icon: FileText, keywords: "mechanism pipeline" },
  { id: "d-quick", title: "Quickstart", group: "Documentation", path: "/docs", hash: "quickstart", icon: FileText, keywords: "getting started setup begin" },
  { id: "d-concepts", title: "Core concepts", group: "Documentation", path: "/docs", hash: "core-concepts", icon: FileText, keywords: "model context entities" },
  { id: "d-outputs", title: "Structured outputs", group: "Documentation", path: "/docs", hash: "structured-outputs", icon: FileText, keywords: "json schema machine readable evidence" },
  { id: "d-usecases", title: "Use cases", group: "Documentation", path: "/docs", hash: "use-cases", icon: FileText, keywords: "examples scenarios" },
  { id: "d-next", title: "Next steps", group: "Documentation", path: "/docs", hash: "next-steps", icon: FileText, keywords: "continue further" },

  // API sections
  { id: "a-overview", title: "Overview", group: "API Reference", path: "/api-reference", hash: "overview", icon: Code2, keywords: "intro api" },
  { id: "a-auth", title: "Authentication", group: "API Reference", path: "/api-reference", hash: "authentication", icon: Code2, keywords: "api key token bearer auth" },
  { id: "a-errors", title: "Errors", group: "API Reference", path: "/api-reference", hash: "errors", icon: Code2, keywords: "status codes 404 429 500 failures" },
  { id: "a-orgs", title: "Organizations", group: "API Reference", path: "/api-reference", hash: "organizations", icon: Code2, keywords: "org tenant account" },
  { id: "a-sources", title: "Sources", group: "API Reference", path: "/api-reference", hash: "sources", icon: Code2, keywords: "upload documents ingest" },
  { id: "a-context", title: "Context", group: "API Reference", path: "/api-reference", hash: "context", icon: Code2, keywords: "business context query" },
  { id: "a-map", title: "Business Map", group: "API Reference", path: "/api-reference", hash: "business-map", icon: Code2, keywords: "roles departments rules dependencies" },
  { id: "a-workflows", title: "Workflows", group: "API Reference", path: "/api-reference", hash: "workflows", icon: Code2, keywords: "tasks approvals execution" },
  { id: "a-finance", title: "Finance", group: "API Reference", path: "/api-reference", hash: "finance", icon: Code2, keywords: "reconciliation ledger money" },
  { id: "a-evidence", title: "Evidence", group: "API Reference", path: "/api-reference", hash: "evidence", icon: Code2, keywords: "source trail confidence audit" },
  { id: "a-updates", title: "Updates", group: "API Reference", path: "/api-reference", hash: "updates", icon: Code2, keywords: "events stream changes" },
  { id: "a-webhooks", title: "Webhooks", group: "API Reference", path: "/api-reference", hash: "webhooks", icon: Code2, keywords: "callbacks notifications events" },
];

function scrollToId(id: string) {
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    } else if (tries++ < 40) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [location, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    setQuery("");
    setActive(0);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // Global ⌘K / Ctrl+K toggle + Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
        setQuery("");
        setActive(0);
      } else if (e.key === "Escape") {
        setIsOpen((v) => {
          if (v) e.preventDefault();
          return false;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On open: lock body scroll, focus the input, and restore focus on close.
  useEffect(() => {
    if (!isOpen) return;
    const prevFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      prevFocused?.focus?.();
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? ITEMS.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.group.toLowerCase().includes(q) ||
            (i.keywords ?? "").toLowerCase().includes(q),
        )
      : ITEMS;
    return GROUP_ORDER.flatMap((g) => matches.filter((m) => m.group === g));
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const run = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      close();
      if (item.path !== location) setLocation(item.path);
      if (item.hash) {
        scrollToId(item.hash);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [close, location, setLocation],
  );

  const onListKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(filtered[active]);
    } else if (e.key === "Tab") {
      // Trap focus within the dialog.
      const focusables = e.currentTarget.querySelectorAll<HTMLElement>(
        'input, button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // Keep the active row scrolled into view
  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, isOpen]);

  let runningIndex = -1;

  return (
    <CommandPaletteContext.Provider value={{ open }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] sm:pt-[16vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={close}
              aria-hidden="true"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className="relative w-full max-w-xl border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              onKeyDown={onListKey}
            >
              {/* Search input — iOS-style field */}
              <div className="p-3">
                <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/60 px-3.5 transition-shadow focus-within:ring-2 focus-within:ring-ring">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search pages, docs, and API..."
                    className="w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <kbd className="hidden sm:flex items-center font-mono text-[10px] font-bold text-muted-foreground/80 border border-border rounded-md px-1.5 py-0.5">
                    ESC
                  </kbd>
                </div>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-[min(60vh,380px)] overflow-y-auto px-2 pb-2"
              >
                {filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No results for{" "}
                    <span className="font-medium text-foreground">
                      "{query}"
                    </span>
                  </div>
                ) : (
                  GROUP_ORDER.map((group) => {
                    const groupItems = filtered.filter(
                      (i) => i.group === group,
                    );
                    if (groupItems.length === 0) return null;
                    return (
                      <div key={group} className="mb-1 last:mb-0">
                        <div className="px-3 pt-3 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {group}
                        </div>
                        {groupItems.map((item) => {
                          runningIndex += 1;
                          const index = runningIndex;
                          const isActive = index === active;
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              data-cmd-index={index}
                              onMouseMove={() => setActive(index)}
                              onClick={() => run(item)}
                              className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="cmd-active"
                                  className="absolute inset-0 rounded-xl bg-secondary"
                                  transition={{
                                    type: "spring",
                                    stiffness: 600,
                                    damping: 40,
                                  }}
                                />
                              )}
                              <span
                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                  isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="relative z-10 flex-1 min-w-0">
                                <span
                                  className={`block truncate font-medium ${
                                    isActive ? "text-foreground" : "text-foreground/90"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </span>
                              {isActive && (
                                <CornerDownLeft className="relative z-10 h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer hints */}
              <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="flex items-center justify-center border border-border rounded-md h-4 w-4 bg-background">
                      <ArrowUp className="h-2.5 w-2.5" />
                    </kbd>
                    <kbd className="flex items-center justify-center border border-border rounded-md h-4 w-4 bg-background">
                      <ArrowDown className="h-2.5 w-2.5" />
                    </kbd>
                    to navigate
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <kbd className="flex items-center justify-center border border-border rounded-md h-4 px-1 bg-background">
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </kbd>
                    to select
                  </span>
                </div>
                <span className="font-mono font-bold tracking-tight text-foreground/70">
                  ORGNI
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CommandPaletteContext.Provider>
  );
}

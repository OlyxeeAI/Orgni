import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ title, children }: { title?: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  return (
    <div className="rounded-sm overflow-hidden border border-border my-4">
      <div className="flex items-center justify-between bg-foreground/95 px-4 py-2 border-b border-white/10">
        <span className="font-mono text-[11px] font-bold tracking-widest text-background/60">
          {title ?? "SHELL"}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest text-background/50 hover:text-background transition-colors focus-visible:outline-none focus-visible:text-background focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-primary" aria-hidden="true" />
              COPIED
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              COPY
            </>
          )}
        </button>
      </div>
      <pre className="bg-foreground text-background font-mono text-[13px] leading-6 p-4 overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );
}

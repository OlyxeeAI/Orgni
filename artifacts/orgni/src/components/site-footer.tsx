import { Link } from "wouter";

function handleHashNav(e: React.MouseEvent, hash: string) {
  const id = hash.replace(/^\/?#/, "");
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  }
}

export function SiteFooter({ dark = false }: { dark?: boolean }) {
  const footerClass = dark
    ? "border-t border-white/10 py-12 md:py-16 bg-black text-white"
    : "border-t border-border py-12 md:py-16 bg-background";
  const muted = dark ? "text-white/60" : "text-muted-foreground";
  const linkHover = "hover:text-primary transition-colors";
  const innerBorder = dark ? "border-white/10" : "border-border";

  return (
    <footer className={footerClass}>
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={`${import.meta.env.BASE_URL}orgni-logo.png`} alt="Orgni logo" className="h-6 w-6 rounded-sm object-cover" />
              <span className="font-mono font-bold tracking-tight">ORGNI</span>
            </div>
            <p className={`text-sm ${muted} mb-4 max-w-xs`}>Live business context for modern operations.</p>
            <p className={`text-xs ${muted} max-w-xs`}>A product by Olyxee, a research and infrastructure company for operational intelligence.</p>
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase mb-4 tracking-wider">Product</h4>
            <ul className={`space-y-3 text-sm ${muted}`}>
              <li><Link href="/#what" onClick={(e) => handleHashNav(e, "#what")} className={linkHover}>What Orgni does</Link></li>
              <li><Link href="/#modules" onClick={(e) => handleHashNav(e, "#modules")} className={linkHover}>Product modules</Link></li>
              <li><Link href="/#use-cases" onClick={(e) => handleHashNav(e, "#use-cases")} className={linkHover}>Use cases</Link></li>
              <li><Link href="/pricing" className={linkHover}>Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase mb-4 tracking-wider">Resources</h4>
            <ul className={`space-y-3 text-sm ${muted}`}>
              <li><Link href="/docs" className={linkHover}>Documentation</Link></li>
              <li><Link href="/api-reference" className={linkHover}>API Reference</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase mb-4 tracking-wider">Company</h4>
            <ul className={`space-y-3 text-sm ${muted}`}>
              <li><Link href="/#" className={linkHover}>About Olyxee</Link></li>
              <li><a href="https://www.olyxee.com/contact" target="_blank" rel="noopener noreferrer" className={linkHover}>Contact</a></li>
              <li><Link href="/#" className={linkHover}>Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className={`pt-8 border-t ${innerBorder} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <div className={`text-sm ${muted} text-center md:text-left`}>
            © {new Date().getFullYear()} Olyxee. All rights reserved.
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-primary/20"></div>
            <div className="h-2 w-2 rounded-full bg-primary/40"></div>
            <div className="h-2 w-2 rounded-full bg-primary"></div>
          </div>
        </div>
      </div>
    </footer>
  );
}

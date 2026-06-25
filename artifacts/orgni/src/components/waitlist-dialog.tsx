import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  useJoinWaitlist,
  useGetWaitlistCount,
  ApiError,
} from "@workspace/api-client-react";

type WaitlistContextValue = {
  open: () => void;
};

const WaitlistContext = createContext<WaitlistContextValue | null>(null);

export function useWaitlist(): WaitlistContextValue {
  const ctx = useContext(WaitlistContext);
  if (!ctx) {
    throw new Error("useWaitlist must be used within a WaitlistProvider");
  }
  return ctx;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { data: countData } = useGetWaitlistCount();
  const join = useJoinWaitlist();

  const count = countData?.count ?? 0;

  function reset() {
    setEmail("");
    setCompany("");
    setError(null);
    setDone(false);
    join.reset();
  }

  function open() {
    reset();
    setIsOpen(true);
  }

  function handleOpenChange(next: boolean) {
    setIsOpen(next);
    if (!next) {
      setTimeout(reset, 200);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    join.mutate(
      {
        data: {
          email: trimmed,
          ...(company.trim() ? { company: company.trim() } : {}),
        },
      },
      {
        onSuccess: () => setDone(true),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            setDone(true);
            return;
          }
          setError("Something went wrong. Please try again.");
        },
      },
    );
  }

  return (
    <WaitlistContext.Provider value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="border-border p-0 gap-0 overflow-hidden w-full max-w-full left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none data-[state=closed]:slide-out-to-left-0 data-[state=open]:slide-in-from-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0 data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0">
          {/* Grabber (mobile sheet) */}
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" />

          {done ? (
            <div className="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 text-center sm:px-8 sm:pb-8 sm:pt-8">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-center text-2xl tracking-tight">
                  You're on the list
                </DialogTitle>
                <DialogDescription className="text-center text-base">
                  We'll reach out the moment early access opens. Thanks for your
                  interest in Orgni.
                </DialogDescription>
              </DialogHeader>
              <Button
                onClick={() => handleOpenChange(false)}
                className="mt-7 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-8 sm:pt-8">
              <DialogHeader className="space-y-2 text-center">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary">
                  Early access
                </span>
                <DialogTitle className="text-center text-2xl tracking-tight">
                  Join the waitlist
                </DialogTitle>
                <DialogDescription className="text-center text-base">
                  Orgni's execution engine is in active development. Leave your
                  email and we'll bring you in as soon as it's ready.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                {/* iOS grouped inset list */}
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-secondary/40 transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                  <div>
                    <Label htmlFor="waitlist-email" className="sr-only">
                      Work email
                    </Label>
                    <input
                      id="waitlist-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="Work email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 w-full bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waitlist-company" className="sr-only">
                      Company (optional)
                    </Label>
                    <input
                      id="waitlist-company"
                      type="text"
                      autoComplete="organization"
                      placeholder="Company (optional)"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="h-14 w-full bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="px-1 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={join.isPending}
                  className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {join.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    <>
                      Request early access
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {count > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Join {count.toLocaleString()}+ teams already in line.
                  </p>
                )}
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </WaitlistContext.Provider>
  );
}

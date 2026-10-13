import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Single-key shortcuts. "G then H" means press G, let go, then H. */
export const SHORTCUTS: { keys: string[]; label: string; or?: string[] }[] = [
  { keys: ["N"], label: "Add an expense" },
  { keys: ["/"], or: ["Ctrl", "K"], label: "Search, or run an action" },
  { keys: ["G", "H"], label: "Go to Overview" },
  { keys: ["G", "E"], label: "Go to Expenses" },
  { keys: ["G", "L"], label: "Go to your loans" },
  { keys: ["G", "B"], label: "Go to your budgets" },
  { keys: ["G", "P"], label: "Go to Profile" },
  { keys: ["?"], label: "Show these shortcuts" },
];

const GO_TO: Record<string, string> = { h: "/", e: "/expenses", l: "/personal", b: "/personal?tab=budgets", p: "/profile" };

/** Ignore keys while typing, or while a dialog or menu has focus. */
const busy = (target: EventTarget | null) => {
  const el = target instanceof Element ? target : null;
  if (el?.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")) return true;
  // Only open ones: a closing dialog stays in the page for its 150 ms fade.
  return !!document.querySelector(
    "[role=dialog][data-state=open], [role=alertdialog][data-state=open], [role=menu][data-state=open], [role=listbox][data-state=open]"
  );
};

/** N, /, ?, and G then H/E/L/B/P. Ctrl+K / ⌘K is handled with the command bar. */
export function useShortcuts({ onAdd, onSearch, onHelp }: { onAdd: () => void; onSearch: () => void; onHelp: () => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    let gPressedAt = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || busy(e.target)) return;
      const key = e.key.toLowerCase();
      if (gPressedAt && Date.now() - gPressedAt < 1500) {
        gPressedAt = 0;
        if (GO_TO[key]) {
          e.preventDefault();
          navigate(GO_TO[key]);
        }
        return;
      }
      if (key === "g") gPressedAt = Date.now();
      else if (key === "n") {
        e.preventDefault();
        onAdd();
      } else if (key === "/") {
        e.preventDefault();
        onSearch();
      } else if (e.key === "?") {
        e.preventDefault();
        onHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, onAdd, onSearch, onHelp]);
}

export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-secondary px-1.5 font-sans text-xs font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog({ open, onOpenChange, isMac }: { open: boolean; onOpenChange: (open: boolean) => void; isMac: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>They work anywhere except while you're typing.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y">
          {SHORTCUTS.map(({ keys, or, label }) => (
            <div key={keys.join("+")} className="flex items-center justify-between gap-4 py-2 text-sm">
              <dt>{label}</dt>
              <dd className="flex shrink-0 items-center gap-1">
                {keys.map((k, i) => (
                  <span key={k} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-muted-foreground">then</span>}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
                {or && (
                  <>
                    <span className="text-xs text-muted-foreground">or</span>
                    <Kbd>{isMac ? "⌘" : or[0]}</Kbd>
                    <Kbd>{or[1]}</Kbd>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

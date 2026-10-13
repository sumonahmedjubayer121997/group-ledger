import { useState } from "react";
import { MonitorDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppActions } from "@/app/appActions";

const KEY = "splitwize:install-banner-dismissed";

const dismissedBefore = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** On phones and tablets, one quiet line offering the app until it's installed or dismissed. */
export function InstallBanner() {
  const { installState, openInstall } = useAppActions();
  const [dismissed, setDismissed] = useState(dismissedBefore);
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  if (dismissed || !touch || (installState !== "prompt" && installState !== "ios")) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* it just shows again next time */
    }
    setDismissed(true);
  };

  return (
    <section aria-label="Install the app" className="flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm">
      <MonitorDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1">Add SplitWize to your home screen. It opens like an app and works offline.</p>
      <Button size="sm" onClick={openInstall}>
        Install
      </Button>
      <Button variant="ghost" size="icon" className="-mr-2 h-9 w-9 text-muted-foreground" onClick={dismiss} aria-label="Not now">
        <X aria-hidden="true" />
      </Button>
    </section>
  );
}

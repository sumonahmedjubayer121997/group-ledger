import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";

const HOUR = 60 * 60 * 1000;

/**
 * Registers the service worker (offline use and installing) and, after a deploy, offers the new
 * version with a Reload button rather than swapping it in while someone is mid-way through a form.
 */
export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // An app left open for days still hears about new versions.
      if (registration) window.setInterval(() => void registration.update().catch(() => undefined), HOUR);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    const shown = toast({
      title: "A new version of SplitWize is ready",
      description: "Reload to use it. Nothing you've saved is lost.",
      duration: Infinity,
      action: (
        <ToastAction altText="Reload to update" onClick={() => void updateServiceWorker(true)}>
          Reload
        </ToastAction>
      ),
    });
    return () => shown.dismiss();
  }, [needRefresh, updateServiceWorker]);

  return null;
}

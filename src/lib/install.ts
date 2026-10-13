import { useSyncExternalStore } from "react";

/**
 * Installing SplitWize as an app. Chrome, Edge and Android offer an install prompt, which is kept
 * here (it fires once, early) so an "Install app" button can show it later. iPhones and iPads have
 * no prompt: people use Share → Add to Home Screen, so the app explains that instead.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = "prompt" | "ios" | "installed" | "unavailable";

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
    void import("@/lib/usage").then(({ track }) => track("app_installed")).catch(() => undefined);
  });
}

/** Running as the installed app rather than in a browser tab. */
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const snapshot = (): InstallState => {
  if (installed || isStandalone()) return "installed";
  if (deferred) return "prompt";
  return isIos() ? "ios" : "unavailable";
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useInstallState = () => useSyncExternalStore(subscribe, snapshot, () => "unavailable" as InstallState);

/** Shows the browser's install prompt. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

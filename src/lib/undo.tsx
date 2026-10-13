import { create } from "zustand";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/usage";

/**
 * "Undo" instead of "Are you sure?". Two kinds:
 * - deferWithUndo: the item disappears at once, but the real delete waits 8 seconds, so Undo just
 *   cancels it. (If the tab is hidden first, pending deletes run straight away.)
 * - doneWithUndo: the change is made now; Undo makes the opposite change.
 */

const UNDO_MS = 8000;

type HiddenStore = { hidden: Set<string>; hide: (id: string) => void; show: (id: string) => void };

/** Ids waiting to be deleted; lists leave them out. */
export const useHidden = create<HiddenStore>((set) => ({
  hidden: new Set(),
  hide: (id) => set((s) => ({ hidden: new Set(s.hidden).add(id) })),
  show: (id) =>
    set((s) => {
      const next = new Set(s.hidden);
      next.delete(id);
      return { hidden: next };
    }),
}));

const pending = new Map<string, { timer: number; run: () => Promise<unknown>; hides: string[] }>();

const showAll = (ids: string[]) => ids.forEach((id) => useHidden.getState().show(id));

const flush = (id: string) => {
  const job = pending.get(id);
  if (!job) return;
  window.clearTimeout(job.timer);
  pending.delete(id);
  job.run().catch(() => {
    showAll(job.hides);
    toast({ title: "Couldn't finish that", description: "It's back where it was.", variant: "destructive" });
  });
};

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") [...pending.keys()].forEach(flush);
  });
}

/** `hide` lists the ids to hide when one Undo covers several items (default: just `id`). */
export function deferWithUndo({
  id,
  hide = [id],
  title,
  description,
  run,
}: {
  id: string;
  hide?: string[];
  title: string;
  description?: string;
  run: () => Promise<unknown>;
}) {
  hide.forEach((h) => useHidden.getState().hide(h));
  const timer = window.setTimeout(() => flush(id), UNDO_MS);
  pending.set(id, { timer, run, hides: hide });
  const shown = toast({
    title,
    description,
    duration: UNDO_MS,
    action: (
      <ToastAction
        altText="Undo"
        onClick={() => {
          const job = pending.get(id);
          if (job) window.clearTimeout(job.timer);
          pending.delete(id);
          showAll(hide);
          track("undo_used");
          shown.dismiss();
        }}
      >
        Undo
      </ToastAction>
    ),
  });
}

export function doneWithUndo({ title, description, undo }: { title: string; description?: string; undo: () => Promise<unknown> | void }) {
  const shown = toast({
    title,
    description,
    duration: UNDO_MS,
    action: (
      <ToastAction
        altText="Undo"
        onClick={() => {
          track("undo_used");
          shown.dismiss();
          void Promise.resolve(undo()).catch(() =>
            toast({ title: "Couldn't undo", description: "Please change it back by hand.", variant: "destructive" })
          );
        }}
      >
        Undo
      </ToastAction>
    ),
  });
}

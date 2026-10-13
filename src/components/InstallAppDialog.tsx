import { Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** iPhone and iPad: there's no install button, so show the three taps instead. */
export function InstallAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const steps = [
    { icon: Share, text: "Tap the Share button in Safari's toolbar." },
    { icon: SquarePlus, text: "Scroll down and tap Add to Home Screen." },
    { icon: null, text: "Tap Add. SplitWize opens from your home screen like any other app." },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add SplitWize to your home screen</DialogTitle>
          <DialogDescription>It opens full screen, without the browser around it, and works offline.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-start gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium" aria-hidden="true">
                {i + 1}
              </span>
              <span className="pt-1">
                {text}
                {Icon && <Icon className="ml-1.5 inline h-4 w-4 align-[-3px] text-muted-foreground" aria-hidden="true" />}
              </span>
            </li>
          ))}
        </ol>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

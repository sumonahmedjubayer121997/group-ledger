import { useEffect, useMemo, useState } from "react";
import { startOfMonth, subMonths } from "date-fns";
import { Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { buildRecap, drawRecap, recapText } from "@/lib/recap";
import { toCurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Expense, Group } from "@/stores/expenseStore";
import { useSpendRows } from "@/stores/useSpending";

/**
 * "Flat 12 spent $1,261 in October": a card for the group chat, drawn here on the phone. Shares
 * the picture where the phone can, otherwise downloads it; the text carries a link back.
 */
export default function RecapDialog({ group, expenses, open, onOpenChange }: { group: Group; expenses: Expense[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const rows = useSpendRows(expenses);
  const now = useMemo(() => new Date(), []);
  const months = useMemo(() => [startOfMonth(subMonths(now, 1)), startOfMonth(now)], [now]);
  const options = { groupName: group.name, currency: toCurrencyCode(group.settings?.currency), people: group.members.length };
  const recaps = months.map((m) => buildRecap(rows, m, now, options));
  // Last month when it had spending (a finished month makes the better story), else this month.
  const [chosen, setChosen] = useState<number | null>(null);
  const index = chosen ?? (recaps[0] ? 0 : 1);
  const recap = recaps[index];
  const [image, setImage] = useState<string | null>(null);
  const url = window.location.origin;
  const text = recap ? recapText(recap, url) : "";

  useEffect(() => {
    if (!open || !recap) return;
    let cancelled = false;
    setImage(null);
    // Drawn off screen, then shown as an image (which is also what gets shared).
    const canvas = document.createElement("canvas");
    void drawRecap(canvas, recap, window.location.host).then(() => {
      if (!cancelled) setImage(canvas.toDataURL("image/png"));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, text]);

  const fileName = `${group.name.replace(/[^\w-]+/g, "-")}-${recap?.monthLabel.replace(/\s+/g, "-") ?? "recap"}.png`.toLowerCase();

  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = fileName;
    a.click();
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Message copied", description: "Paste it with the picture in your group chat." });
    } catch {
      toast({ title: "Couldn't copy", description: text });
    }
  };

  const share = async () => {
    if (!image) return;
    const blob = await (await fetch(image)).blob();
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, title: `${group.name} · ${recap?.monthLabel}` });
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") toast({ title: "Couldn't share", description: "Download the picture instead.", variant: "destructive" });
      }
      return;
    }
    // No picture sharing here (most desktop browsers): save it and copy the message.
    download();
    await copyText();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share a recap</DialogTitle>
          <DialogDescription>A picture of the group's month for your group chat. Only totals, no names.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2" role="group" aria-label="Month">
          {months.map((m, i) => (
            <button
              key={m.toISOString()}
              type="button"
              disabled={!recaps[i]}
              aria-pressed={i === index}
              onClick={() => setChosen(i)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
                i === index ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {i === 0 ? "Last month" : "This month"}
            </button>
          ))}
        </div>

        {recap ? (
          <>
            {image ? (
              <img src={image} alt={text} className="aspect-square w-full rounded-lg border" />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-lg bg-secondary" aria-hidden="true" />
            )}
            <p className="text-sm text-muted-foreground">{text}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => void copyText()}>
                <Copy aria-hidden="true" />
                Copy message
              </Button>
              <Button variant="outline" onClick={download} disabled={!image}>
                <Download aria-hidden="true" />
                Download
              </Button>
              <Button onClick={() => void share()} disabled={!image}>
                <Share2 aria-hidden="true" />
                Share
              </Button>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No expenses in the last two months to recap yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

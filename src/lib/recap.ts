import { addMonths, format, startOfMonth } from "date-fns";
import { formatMoney } from "@/lib/money";
import { summarizeSpending } from "@/lib/spendingSummary";

/**
 * A group's month in one card, to share in the group chat: "Flat 12 spent $1,261 in October,
 * 95% on rent". Drawn on the phone (see drawRecap), so it needs no server.
 */
export type Recap = {
  groupName: string;
  currency: string;
  /** "October", or "October so far" for the month that isn't over. */
  monthLabel: string;
  total: number;
  count: number;
  people: number;
  /** Up to three biggest categories, with their share of the total. */
  top: { label: string; cents: number; pct: number }[];
};

export function buildRecap(
  rows: { date: Date; cents: number; category: string }[],
  month: Date,
  now: Date,
  { groupName, currency, people }: { groupName: string; currency: string; people: number }
): Recap | null {
  const start = startOfMonth(month);
  const end = addMonths(start, 1);
  const inMonth = rows.filter((r) => r.date >= start && r.date < end && r.cents > 0);
  if (inMonth.length === 0) return null;
  const summary = summarizeSpending(
    inMonth.map((r) => ({ cents: r.cents, shareCents: 0, category: r.category, payer: "", date: r.date, description: "" })),
    { maxCategories: 3 }
  );
  const partial = now >= start && now < end;
  return {
    groupName,
    currency,
    monthLabel: `${format(start, "MMMM")}${partial ? " so far" : ""}`,
    total: summary.total,
    count: summary.count,
    people,
    top: summary.categories,
  };
}

/** The message that goes with the card, ending with a link back to SplitWize. */
export function recapText(recap: Recap, url: string): string {
  const [first] = recap.top;
  const share = first && recap.top.length > 1 ? `, ${first.pct}% on ${first.label.toLowerCase()}` : "";
  return `${recap.groupName} spent ${formatMoney(recap.total, recap.currency)} in ${recap.monthLabel}${share}. Split with SplitWize: ${url}`;
}

/** Draws the card as a 1080×1080 image (square, so it previews well in chat apps). */
export async function drawRecap(canvas: HTMLCanvasElement, recap: Recap, host: string) {
  const size = 1080;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Wait for the app's fonts, so the card looks like the app (falls back to system fonts).
  await Promise.all(
    ['72px "Instrument Serif"', '40px "Inter"', '600 40px "Inter"', '40px "Noto Sans Bengali"'].map((f) => document.fonts?.load(f).catch(() => undefined))
  );
  const serif = '"Instrument Serif", "Noto Sans Bengali", Georgia, serif';
  const sans = '"Inter", "Noto Sans Bengali", system-ui, sans-serif';
  const ink = "#111111";
  const muted = "#6B6A64";
  const rule = "#E6E4DD";
  const green = "#1F7A5A";
  const pad = 96;

  ctx.fillStyle = "#FAFAF7";
  ctx.fillRect(0, 0, size, size);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = ink;
  ctx.font = `64px ${serif}`;
  ctx.fillText("SplitWize", pad, pad + 40);
  ctx.fillStyle = muted;
  ctx.font = `40px ${sans}`;
  ctx.fillText(fit(ctx, recap.groupName, size - pad * 2), pad, pad + 120);

  ctx.fillStyle = ink;
  ctx.font = `176px ${serif}`;
  ctx.fillText(fit(ctx, formatMoney(recap.total, recap.currency), size - pad * 2), pad, 420);
  ctx.fillStyle = muted;
  ctx.font = `44px ${sans}`;
  ctx.fillText(`spent in ${recap.monthLabel}`, pad, 490);

  // The biggest categories as bars.
  let y = 600;
  const max = recap.top[0]?.cents || 1;
  for (const row of recap.top) {
    ctx.fillStyle = ink;
    ctx.font = `500 38px ${sans}`;
    ctx.fillText(fit(ctx, row.label, 600), pad, y);
    ctx.fillStyle = muted;
    ctx.font = `38px ${sans}`;
    const pct = `${row.pct}%`;
    ctx.fillText(pct, size - pad - ctx.measureText(pct).width, y);
    ctx.fillStyle = rule;
    roundRect(ctx, pad, y + 20, size - pad * 2, 18);
    ctx.fillStyle = ink;
    roundRect(ctx, pad, y + 20, Math.max(18, ((size - pad * 2) * row.cents) / max), 18);
    y += 110;
  }

  ctx.fillStyle = muted;
  ctx.font = `36px ${sans}`;
  ctx.fillText(`${recap.count} ${recap.count === 1 ? "expense" : "expenses"} · ${recap.people} ${recap.people === 1 ? "person" : "people"}`, pad, size - pad - 60);
  ctx.fillStyle = green;
  ctx.font = `600 36px ${sans}`;
  ctx.fillText(`Split with SplitWize · ${host}`, pad, size - pad);
}

function fit(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.fill();
}

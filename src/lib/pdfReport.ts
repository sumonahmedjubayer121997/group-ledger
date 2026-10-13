import type { jsPDF } from "jspdf";
import type { autoTable as AutoTable } from "jspdf-autotable";
import { format } from "date-fns";
import { formatMoney } from "@/lib/money";
import { pctLabel, type SpendBar, type SpendingSummary } from "@/lib/spendingSummary";

/**
 * The PDF expense report: for each currency, the same summary as the Insights tab (totals, biggest
 * expense, by category, by month, who paid), then every expense in a table. A4, in millimetres.
 */

type RGB = [number, number, number];
const INK: RGB = [28, 25, 23];
const MUTED: RGB = [120, 113, 108];
const RULE: RGB = [221, 217, 213];
const TRACK: RGB = [238, 235, 231];
const BAR: RGB = [68, 64, 60];
const MARGIN = 14;
const ROW = 8.5;

/** The built-in PDF fonts only have Latin characters, so other currency symbols (e.g. ৳) become ISO codes. */
export const pdfMoney = (cents: number, currency: string) => {
  const text = formatMoney(cents, currency);
  return /^[\x20-\x7E£€¥]+$/.test(text)
    ? text
    : `${currency} ${(cents / 100).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export type ReportSection = { currency: string; summary: SpendingSummary };

export type ReportInput = {
  title: string;
  /** e.g. "All groups · All time · 73 expenses" */
  scope: string;
  sections: ReportSection[];
  table: {
    /** Width in mm; leave it out for the column that takes the remaining space. */
    columns: { title: string; width?: number; align?: "right" }[];
    body: string[][];
  };
};

const fit = (doc: jsPDF, text: string, width: number) => {
  if (doc.getTextWidth(text) <= width) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
};

const barsHeight = (count: number) => 11 + count * ROW;
const TILES = 31;

/** How tall one currency's summary is, so it can start on a fresh page rather than split. */
const sectionHeight = (s: SpendingSummary, withHeading: boolean) =>
  (withHeading ? 9 : 0) + TILES + Math.max(barsHeight(s.categories.length), barsHeight(s.months.length)) + 6 + barsHeight(s.payers.length) + 8;

export function buildReport(doc: jsPDF, autoTable: typeof AutoTable, { title, scope, sections, table }: ReportInput) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (height: number) => {
    if (y + height > pageH - MARGIN - 6) {
      doc.addPage();
      y = MARGIN;
    }
  };
  const ink = (size: number, style: "normal" | "bold" = "normal", color: RGB = INK) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const heading = (text: string, size = 12) => {
    ink(size, "bold");
    doc.text(text, MARGIN, y + 4);
    y += size > 12 ? 9 : 7;
  };

  const tiles = (items: { label: string; value: string; sub: string }[]) => {
    const gap = 5;
    const w = (width - gap * (items.length - 1)) / items.length;
    const h = 23;
    ensure(h);
    items.forEach((item, i) => {
      const x = MARGIN + i * (w + gap);
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 2, 2, "S");
      ink(8, "normal", MUTED);
      doc.text(item.label, x + 4, y + 6);
      ink(15);
      doc.text(fit(doc, item.value, w - 8), x + 4, y + 13.5);
      ink(7.5, "normal", MUTED);
      doc.text(fit(doc, item.sub, w - 8), x + 4, y + 19);
    });
    y += h + 8;
  };

  /** A titled list of labelled bars, as in the app. Returns the y below it. */
  const bars = (x: number, top: number, w: number, label: string, rows: SpendBar[], currency: string) => {
    ink(11, "bold");
    doc.text(label, x, top + 4);
    const max = Math.max(...rows.map((r) => r.cents), 1);
    let cy = top + 11;
    for (const row of rows) {
      const amount = `${pdfMoney(row.cents, currency)} · ${pctLabel(row)}`;
      ink(8.5, "normal", MUTED);
      const amountW = doc.getTextWidth(amount);
      doc.text(amount, x + w, cy, { align: "right" });
      ink(8.5);
      doc.text(fit(doc, row.label, w - amountW - 4), x, cy);
      doc.setFillColor(...TRACK);
      doc.roundedRect(x, cy + 1.8, w, 1.8, 0.9, 0.9, "F");
      doc.setFillColor(...BAR);
      doc.roundedRect(x, cy + 1.8, Math.max(1.8, (w * row.cents) / max), 1.8, 0.9, 0.9, "F");
      cy += ROW;
    }
    return cy;
  };

  // Title
  ink(20, "bold");
  doc.text(title, MARGIN, y + 6);
  ink(9, "normal", MUTED);
  doc.text(fit(doc, `${scope} · Made ${format(new Date(), "d MMMM yyyy")}`, width), MARGIN, y + 13);
  y += 22;

  for (const { currency, summary } of sections) {
    ensure(Math.min(sectionHeight(summary, sections.length > 1), pageH - MARGIN * 2 - 6));
    if (sections.length > 1) heading(`In ${currency}`, 13);
    tiles([
      { label: "Total spent", value: pdfMoney(summary.total, currency), sub: `${summary.count} ${summary.count === 1 ? "expense" : "expenses"}` },
      { label: "Your share", value: pdfMoney(summary.mine, currency), sub: summary.total ? `${summary.minePct}% of the total` : "" },
      {
        label: "Biggest expense",
        value: summary.biggest ? pdfMoney(summary.biggest.cents, currency) : "–",
        sub: summary.biggest ? `${summary.biggest.description || "Expense"} · ${format(summary.biggest.date, "d MMM yyyy")}` : "",
      },
    ]);

    // By category and by month side by side, then who paid across the page.
    const gap = 10;
    const half = (width - gap) / 2;
    ensure(Math.max(barsHeight(summary.categories.length), barsHeight(summary.months.length)));
    const left = bars(MARGIN, y, half, "By category", summary.categories, currency);
    const right = bars(MARGIN + half + gap, y, half, "By month", summary.months, currency);
    y = Math.max(left, right) + 6;
    ensure(barsHeight(summary.payers.length));
    y = bars(MARGIN, y, width, "Who paid", summary.payers, currency) + 8;
  }

  // Every expense, starting on its own page.
  if (sections.length > 0) {
    doc.addPage();
    y = MARGIN;
  }
  heading("Expenses", 13);
  autoTable(doc, {
    startY: y,
    head: [table.columns.map((c) => c.title)],
    body: table.body,
    margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    styles: { font: "helvetica", fontSize: 8, textColor: INK, cellPadding: 2, lineColor: RULE, valign: "top" },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 247, 245] },
    columnStyles: Object.fromEntries(
      table.columns.map((c, i) => [i, { cellWidth: c.width ?? "auto", halign: c.align ?? "left" }])
    ),
  });

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    ink(8, "normal", MUTED);
    doc.text("SplitWize", MARGIN, pageH - 8);
    doc.text(`Page ${i} of ${pages}`, pageW - MARGIN, pageH - 8, { align: "right" });
  }
}

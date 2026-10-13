import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { buildReport, pdfMoney } from "./pdfReport";
import { summarizeSpending, type SpendItem } from "./spendingSummary";

const sample = (n: number): SpendItem[] =>
  Array.from({ length: n }, (_, i) => ({
    cents: 1000 + ((i * 3779) % 60000),
    shareCents: 500 + ((i * 1889) % 30000),
    category: ["Food & Dining", "Groceries", "Bills & Utilities", "Travel"][i % 4],
    payer: i % 3 ? "Sumon Ahmed" : "Anik Mahmud",
    date: new Date(2026, 4 - (i % 5), 1 + (i % 27), 12),
    description: `Expense number ${i + 1} with a fairly long description`,
  }));

const build = (currencies: string[], perCurrency: number) => {
  const doc = new jsPDF();
  const sections = currencies.map((currency) => ({ currency, summary: summarizeSpending(sample(perCurrency)) }));
  const body = currencies.flatMap((currency) =>
    sample(perCurrency).map((r) => ["1 May 2026", "3D Chester Road 2", r.description, r.category, r.payer, pdfMoney(r.cents, currency), pdfMoney(r.shareCents, currency)])
  );
  buildReport(doc, autoTable, {
    title: "Expense report",
    scope: "All groups · All time",
    sections,
    table: {
      columns: [
        { title: "Date", width: 21 },
        { title: "Group", width: 28 },
        { title: "Description" },
        { title: "Category", width: 27 },
        { title: "Paid by", width: 26 },
        { title: "Amount", width: 22, align: "right" },
        { title: "Your share", width: 20, align: "right" },
      ],
      body,
    },
  });
  return doc;
};

describe("PDF report", () => {
  it("builds a summary and the table across pages, with page numbers", () => {
    const doc = build(["GBP", "CAD", "USD"], 30);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(5000);
    // Set PDF_PREVIEW=<path> to save a copy to look at.
    if (process.env.PDF_PREVIEW) writeFileSync(process.env.PDF_PREVIEW, Buffer.from(doc.output("arraybuffer")));
  });

  it("uses ISO codes for symbols the PDF fonts can't draw", () => {
    expect(pdfMoney(123456, "GBP")).toBe("£1,234.56");
    expect(pdfMoney(123456, "BDT")).toMatch(/^BDT 1,234\.56$/);
  });
});

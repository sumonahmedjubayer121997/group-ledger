import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useExpenseStore, Expense, Group } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';
import { expenseShares, formatTotals, fromCents, makeResolver, toCents, toCurrencyCode } from '@/lib/money';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, startOfYear, subDays } from 'date-fns';
import type { jsPDF as JsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  children: React.ReactNode;
  /** Pre-selects one group (e.g. when opened from a group page). */
  groupId?: string;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

/** The PDF library is large, so it only downloads when someone exports a PDF. */
const loadPdf = async (): Promise<new () => JsPDF> => {
  const { default: PDF } = await import('jspdf');
  await import('jspdf-autotable');
  return PDF as unknown as new () => JsPDF;
};

type Row = {
  date: Date;
  group: string;
  description: string;
  category: string;
  amountCents: number;
  currency: string;
  paidBy: string;
  splitBetween: string;
  yourShareCents: number;
};

/** Quotes a CSV cell, and stops spreadsheet apps treating text like "=SUM(...)" as a formula. */
const csvCell = (value: string | number) => {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'expenses';

export const ExportDialog: React.FC<ExportDialogProps> = ({ children, groupId }) => {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(groupId ?? 'all');
  const [category, setCategory] = useState('all');

  const { expenses, groups } = useExpenseStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g] as [string, Group])), [groups]);
  const inScope = useMemo(
    () => expenses.filter((e) => groupsById.has(e.groupId) && (selectedGroup === 'all' || e.groupId === selectedGroup)),
    [expenses, groupsById, selectedGroup]
  );
  const categories = useMemo(() => [...new Set(inScope.map((e) => e.category).filter(Boolean))].sort(), [inScope]);

  const rows = useMemo<Row[]>(() => {
    const now = new Date();
    const from =
      dateRange === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : dateRange === 'this_month' ? startOfMonth(now)
      : dateRange === 'this_year' ? startOfYear(now)
      : dateRange === 'last_30_days' ? subDays(now, 30)
      : dateRange === 'custom' && startDate ? new Date(`${startDate}T00:00:00`)
      : null;
    const to = dateRange === 'custom' && endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    return inScope
      .filter((e: Expense) => {
        const d = new Date(e.date);
        return (!from || d >= from) && (!to || d <= to) && (category === 'all' || e.category === category);
      })
      .map((e) => {
        const group = groupsById.get(e.groupId)!;
        const resolve = makeResolver(group.members);
        const me = user ? resolve({ id: user.uid, email: user.email }) : null;
        return {
          date: new Date(e.date),
          group: group.name,
          description: e.description,
          category: e.category || '',
          amountCents: toCents(e.amount),
          currency: toCurrencyCode(group.settings?.currency),
          paidBy: e.paidBy?.name ?? '',
          splitBetween: (e.splitAmong ?? []).map((m) => m.name).join('; '),
          yourShareCents: me ? expenseShares(e, resolve).get(me) ?? 0 : 0,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [inScope, dateRange, startDate, endDate, category, groupsById, user]);

  const totals = useMemo(() => {
    const t = new Map<string, number>();
    for (const r of rows) t.set(r.currency, (t.get(r.currency) ?? 0) + r.amountCents);
    return t;
  }, [rows]);

  const baseName = `${selectedGroup === 'all' ? 'splitwize' : slug(groupsById.get(selectedGroup)?.name ?? '')}-expenses-${format(new Date(), 'yyyy-MM-dd')}`;

  const exportToCSV = () => {
    const header = ['Date', 'Group', 'Description', 'Category', 'Amount', 'Currency', 'Paid by', 'Split between', 'Your share'];
    const lines = rows.map((r) =>
      [
        format(r.date, 'yyyy-MM-dd'),
        r.group,
        r.description,
        r.category,
        fromCents(r.amountCents).toFixed(2),
        r.currency,
        r.paidBy,
        r.splitBetween,
        fromCents(r.yourShareCents).toFixed(2),
      ]
        .map(csvCell)
        .join(',')
    );
    // The byte-order mark makes Excel read names in Bangla and other scripts correctly.
    download(new Blob(['﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${baseName}.csv`);
  };

  // The PDF fonts can't draw every currency symbol (e.g. ৳), so amounts use ISO codes.
  const pdfAmount = (cents: number, currency: string) =>
    `${currency} ${fromCents(cents).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportToPDF = async () => {
    const PDF = await loadPdf();
    const doc = new PDF();
    doc.setFontSize(18);
    doc.text('SplitWize expense report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated ${format(new Date(), 'd MMMM yyyy')}  ·  ${rows.length} expenses`, 14, 28);
    const totalsText = [...totals].map(([c, cents]) => pdfAmount(cents, c)).join('   ');
    doc.text(`Total: ${totalsText || '0'}`, 14, 35);
    doc.autoTable({
      head: [['Date', 'Group', 'Description', 'Amount', 'Paid by', 'Your share']],
      body: rows.map((r) => [
        format(r.date, 'd MMM yyyy'),
        r.group,
        r.description,
        pdfAmount(r.amountCents, r.currency),
        r.paidBy,
        pdfAmount(r.yourShareCents, r.currency),
      ]),
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [31, 41, 55] },
    });
    doc.save(`${baseName}.pdf`);
  };

  const handleExport = async () => {
    try {
      if (exportFormat === 'csv') exportToCSV();
      else await exportToPDF();
      toast({ title: 'Export ready', description: `${rows.length} expenses saved to your downloads.` });
      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Export expenses</span>
          </DialogTitle>
          <DialogDescription>Download expenses as a spreadsheet (CSV) or a printable PDF.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'pdf')} className="grid grid-cols-2 gap-2">
              <Label htmlFor="fmt-csv" className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="csv" id="fmt-csv" />
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </Label>
              <Label htmlFor="fmt-pdf" className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <FileText className="w-4 h-4" />
                PDF
              </Label>
            </RadioGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="export-group">Group</Label>
              <Select value={selectedGroup} onValueChange={(v) => { setSelectedGroup(v); setCategory('all'); }}>
                <SelectTrigger id="export-group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="export-category" className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-range">Dates</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="export-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last_30_days">Last 30 days</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="this_year">This year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start-date" className="text-xs">From</Label>
                  <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-xs">To</Label>
                  <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-4" aria-live="polite">
            <div className="font-medium">
              {rows.length} expense{rows.length === 1 ? '' : 's'}
            </div>
            <div className="text-sm text-muted-foreground">Total: {rows.length ? formatTotals(totals) : 'nothing to export'}</div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={rows.length === 0} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download {exportFormat.toUpperCase()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

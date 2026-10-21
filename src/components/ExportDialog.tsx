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
import { memberFor } from '@/lib/claims';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, startOfYear, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { summarizeSpending } from '@/lib/spendingSummary';

interface ExportDialogProps {
  children: React.ReactNode;
  /** Pre-selects one group (e.g. when opened from a group page). */
  groupId?: string;
  /** Export just these expenses (selected on the Expenses page); hides the filters. */
  onlyIds?: string[];
}

/**
 * The PDF library is large, so it only downloads when someone exports a PDF. jspdf-autotable 5 no
 * longer adds doc.autoTable() when imported as a module, so its autoTable(doc, options) is used.
 */
const loadPdf = async () => {
  const [{ jsPDF }, { autoTable }, { buildReport, pdfMoney }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('@/lib/pdfReport'),
  ]);
  return { jsPDF, autoTable, buildReport, pdfMoney };
};

const rangeLabels: Record<string, string> = {
  all: 'All time',
  today: 'Today',
  last_30_days: 'Last 30 days',
  this_month: 'This month',
  this_year: 'This year',
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

export const ExportDialog: React.FC<ExportDialogProps> = ({ children, groupId, onlyIds }) => {
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
  const only = useMemo(() => (onlyIds ? new Set(onlyIds) : null), [onlyIds]);
  const inScope = useMemo(
    () =>
      expenses.filter(
        (e) => groupsById.has(e.groupId) && (only ? only.has(e.id) : selectedGroup === 'all' || e.groupId === selectedGroup)
      ),
    [expenses, groupsById, selectedGroup, only]
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
        const resolve = makeResolver(group.members, group.aliases);
        const me = user ? resolve({ id: user.uid, email: user.email }) : null;
        return {
          date: new Date(e.date),
          group: group.name,
          description: e.description,
          category: e.category || '',
          amountCents: toCents(e.amount),
          currency: toCurrencyCode(group.settings?.currency),
          paidBy: memberFor(group, e.paidBy).name,
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

  const baseName = `${only ? 'splitwize-selected' : selectedGroup === 'all' ? 'splitwize' : slug(groupsById.get(selectedGroup)?.name ?? '')}-expenses-${format(new Date(), 'yyyy-MM-dd')}`;

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

  /** A summary per currency (as on the Insights tab), then every expense. */
  const exportToPDF = async () => {
    const { jsPDF, autoTable, buildReport, pdfMoney } = await loadPdf();
    const doc = new jsPDF();

    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
    const sections = [...counts]
      .sort((a, b) => b[1] - a[1])
      .map(([currency]) => ({
        currency,
        summary: summarizeSpending(
          rows
            .filter((r) => r.currency === currency)
            .map((r) => ({ cents: r.amountCents, shareCents: r.yourShareCents, category: r.category, payer: r.paidBy, date: r.date, description: r.description }))
        ),
      }));

    const dates =
      dateRange === 'custom'
        ? `${startDate ? format(new Date(`${startDate}T00:00:00`), 'd MMM yyyy') : 'the start'} to ${endDate ? format(new Date(`${endDate}T00:00:00`), 'd MMM yyyy') : 'today'}`
        : rangeLabels[dateRange] ?? 'All time';
    const scope = only
      ? `${rows.length} selected ${rows.length === 1 ? 'expense' : 'expenses'}`
      : [
          selectedGroup === 'all' ? 'All groups' : groupsById.get(selectedGroup)?.name ?? 'One group',
          category === 'all' ? '' : category,
          dates,
          `${rows.length} ${rows.length === 1 ? 'expense' : 'expenses'}`,
        ]
          .filter(Boolean)
          .join(' · ');

    // A4 leaves 182 mm; Description takes what's left.
    const manyGroups = new Set(rows.map((r) => r.group)).size > 1;
    buildReport(doc, autoTable, {
      title: 'Expense report',
      scope,
      sections,
      table: {
        columns: [
          { title: 'Date', width: 21 },
          ...(manyGroups ? [{ title: 'Group', width: 28 }] : []),
          { title: 'Description' },
          { title: 'Category', width: 27 },
          { title: 'Paid by', width: 26 },
          { title: 'Amount', width: 22, align: 'right' as const },
          { title: 'Your share', width: 20, align: 'right' as const },
        ],
        body: rows.map((r) => [
          format(r.date, 'd MMM yyyy'),
          ...(manyGroups ? [r.group] : []),
          r.description,
          r.category,
          r.paidBy,
          pdfMoney(r.amountCents, r.currency),
          pdfMoney(r.yourShareCents, r.currency),
        ]),
      },
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
          <DialogDescription>
            {only
              ? `Download the ${only.size} selected expense${only.size === 1 ? '' : 's'} as a spreadsheet (CSV) or a printable PDF.`
              : 'Download expenses as a spreadsheet (CSV) or a printable PDF.'}
          </DialogDescription>
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

          {!only && (
          <>
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
          </>
          )}

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

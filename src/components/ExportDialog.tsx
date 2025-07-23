import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useExpenseStore, Expense } from '@/stores/expenseStore';
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react';
import { format, startOfMonth, startOfYear, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  children: React.ReactNode;
}

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const categories = ['food', 'travel', 'entertainment', 'utilities', 'shopping', 'rent', 'healthcare', 'other'];

export const ExportDialog: React.FC<ExportDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [expenseStatus, setExpenseStatus] = useState('all');

  const { expenses, groups, settlements } = useExpenseStore();
  const { toast } = useToast();

  const allMembers = groups.flatMap(group => group.members);
  const uniqueMembers = allMembers.filter((member, index, self) => 
    index === self.findIndex(m => m.id === member.id)
  );

  const getFilteredExpenses = (): Expense[] => {
    let filtered = [...expenses];

    // Date filtering
    if (dateRange !== 'all') {
      const now = new Date();
      let filterStartDate: Date;

      switch (dateRange) {
        case 'today':
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this_month':
          filterStartDate = startOfMonth(now);
          break;
        case 'this_year':
          filterStartDate = startOfYear(now);
          break;
        case 'last_30_days':
          filterStartDate = subDays(now, 30);
          break;
        case 'custom':
          if (startDate && endDate) {
            filtered = filtered.filter(expense => {
              const expenseDate = new Date(expense.date);
              return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
            });
          }
          return filtered;
        default:
          filterStartDate = new Date(0);
      }

      filtered = filtered.filter(expense => new Date(expense.date) >= filterStartDate);
    }

    // Group filtering
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(expense => expense.groupId === selectedGroup);
    }

    // Category filtering
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(expense => selectedCategories.includes(expense.category));
    }

    // People filtering
    if (selectedPeople.length > 0) {
      filtered = filtered.filter(expense => 
        selectedPeople.includes(expense.paidBy.id) ||
        expense.splitAmong.some(member => selectedPeople.includes(member.id))
      );
    }

    return filtered;
  };

  const exportToCSV = () => {
    const filteredExpenses = getFilteredExpenses();
    
    const headers = ['Date', 'Description', 'Amount', 'Paid By', 'Split Among', 'Category', 'Group'];
    const rows = filteredExpenses.map(expense => {
      const group = groups.find(g => g.id === expense.groupId);
      const splitNames = expense.splitAmong.map(m => m.name).join('; ');
      
      return [
        format(new Date(expense.date), 'yyyy-MM-dd'),
        expense.description,
        expense.amount.toFixed(2),
        expense.paidBy.name,
        splitNames,
        expense.category,
        group?.name || 'Unknown Group'
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredExpenses.length} expenses to CSV`,
    });
  };

  const exportToPDF = () => {
    const filteredExpenses = getFilteredExpenses();
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('SplitSmart - Expense Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, 20, 30);
    doc.text(`Total Expenses: ${filteredExpenses.length}`, 20, 40);

    // Summary Statistics
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryBreakdown = filteredExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 20, 50);
    
    // Category breakdown
    let yPos = 65;
    doc.setFontSize(14);
    doc.text('Category Breakdown:', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    Object.entries(categoryBreakdown).forEach(([category, amount]) => {
      doc.text(`${category}: $${amount.toFixed(2)}`, 30, yPos);
      yPos += 8;
    });

    // Expense table
    const tableData = filteredExpenses.map(expense => {
      const group = groups.find(g => g.id === expense.groupId);
      return [
        format(new Date(expense.date), 'MMM dd'),
        expense.description,
        `$${expense.amount.toFixed(2)}`,
        expense.paidBy.name,
        expense.category,
        group?.name || 'Unknown'
      ];
    });

    doc.autoTable({
      head: [['Date', 'Description', 'Amount', 'Paid By', 'Category', 'Group']],
      body: tableData,
      startY: yPos + 10,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`expenses-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredExpenses.length} expenses to PDF`,
    });
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV();
    } else {
      exportToPDF();
    }
    setOpen(false);
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    }
  };

  const handlePersonChange = (personId: string, checked: boolean) => {
    if (checked) {
      setSelectedPeople([...selectedPeople, personId]);
    } else {
      setSelectedPeople(selectedPeople.filter(p => p !== personId));
    }
  };

  const filteredCount = getFilteredExpenses().length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Export Expenses</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center space-x-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV (Spreadsheet)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center space-x-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  <span>PDF (Report)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Group Filter */}
          <div className="space-y-3">
            <Label>Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <Label>Categories</Label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                  />
                  <Label htmlFor={category} className="capitalize cursor-pointer">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* People Filter */}
          {uniqueMembers.length > 0 && (
            <div className="space-y-3">
              <Label>People</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {uniqueMembers.map(member => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={member.id}
                      checked={selectedPeople.includes(member.id)}
                      onCheckedChange={(checked) => handlePersonChange(member.id, checked as boolean)}
                    />
                    <Label htmlFor={member.id} className="cursor-pointer">
                      {member.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Export Preview</div>
            <div className="font-medium">
              {filteredCount} expenses will be exported
            </div>
            <div className="text-sm text-muted-foreground">
              Total value: ${getFilteredExpenses().reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={filteredCount === 0}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Export {exportFormat.toUpperCase()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
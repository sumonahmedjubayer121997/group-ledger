
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Expense } from '@/stores/expenseStore';
import { TrendingUp, PieChart as PieChartIcon, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExpenseChartProps {
  expenses: Expense[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ expenses }) => {
  // Group expenses by category
  const categoryData = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Other';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  // Group expenses by month
  const monthlyData = expenses.reduce((acc, expense) => {
    const month = new Date(expense.date).toLocaleDateString('en-US', { month: 'short' });
    acc[month] = (acc[month] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    amount,
  }));

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Expense Analytics Report', 20, 20);
    
    // Date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Total Expenses: ${expenses.length}`, 20, 40);
    doc.text(`Total Amount: $${expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}`, 20, 50);
    
    // Category breakdown table
    doc.setFontSize(14);
    doc.text('Expense Breakdown by Category', 20, 70);
    
    const categoryTableData = Object.entries(categoryData).map(([category, amount]) => [
      category,
      `$${amount.toFixed(2)}`,
      `${((amount / expenses.reduce((sum, exp) => sum + exp.amount, 0)) * 100).toFixed(1)}%`
    ]);
    
    (doc as any).autoTable({
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryTableData,
      startY: 80,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    // Monthly breakdown table
    let finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Monthly Spending Trend', 20, finalY);
    
    const monthlyTableData = Object.entries(monthlyData).map(([month, amount]) => [
      month,
      `$${amount.toFixed(2)}`
    ]);
    
    (doc as any).autoTable({
      head: [['Month', 'Amount']],
      body: monthlyTableData,
      startY: finalY + 10,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    
    // Recent expenses
    finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Recent Expenses', 20, finalY);
    
    const recentExpenses = expenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(expense => [
        expense.description,
        expense.category,
        `$${expense.amount.toFixed(2)}`,
        new Date(expense.date).toLocaleDateString(),
        expense.paidBy.name
      ]);
    
    (doc as any).autoTable({
      head: [['Description', 'Category', 'Amount', 'Date', 'Paid By']],
      body: recentExpenses,
      startY: finalY + 10,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] },
    });
    
    doc.save('expense-analytics.pdf');
  };

  if (expenses.length === 0) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span>Expense Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <PieChartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No data to display</p>
            <p className="text-sm text-gray-500">Add expenses to see analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span>Expense Analytics</span>
          </CardTitle>
          <Button
            onClick={exportToPDF}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Pie Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Bar Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Amount']} />
                <Bar dataKey="amount" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

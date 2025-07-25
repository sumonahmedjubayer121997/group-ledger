import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { BarChart3, PieChart, TrendingUp, DollarSign, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface GroupAnalyticsProps {
  group: Group;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const GroupAnalytics: React.FC<GroupAnalyticsProps> = ({ group }) => {
  const { getGroupAnalytics, getGroupExpenses } = useExpenseStore();
  const analytics = getGroupAnalytics(group.id);
  const expenses = getGroupExpenses(group.id);

  // Prepare member spending data
  const memberSpendingData = Object.entries(analytics.memberSpending).map(([memberId, amount]) => {
    const member = group.members.find(m => m.id === memberId);
    const numAmount = Number(amount);
    return {
      name: member?.name || 'Unknown',
      amount: numAmount,
      percentage: (numAmount / analytics.totalSpent) * 100,
    };
  }).sort((a, b) => b.amount - a.amount);

  // Prepare category spending data
  const categorySpendingData = Object.entries(analytics.categorySpending).map(([category, amount]) => {
    const numAmount = Number(amount);
    return {
      name: category.charAt(0).toUpperCase() + category.slice(1),
      amount: numAmount,
      percentage: (numAmount / analytics.totalSpent) * 100,
    };
  }).sort((a, b) => b.amount - a.amount);

  // Monthly spending trend (last 6 months)
  const monthlyData = React.useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === month.getMonth() && 
               expenseDate.getFullYear() === month.getFullYear();
      });
      
      months.push({
        month: month.toLocaleString('default', { month: 'short' }),
        amount: monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        count: monthExpenses.length,
      });
    }
    
    return months;
  }, [expenses]);

  const exportGroupAnalyticsToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Cover Page
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(`${group.name}`, 105, 40, { align: 'center' });
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "normal");
      doc.text('Analytics Report', 105, 55, { align: 'center' });
      
      // Add a decorative line
      doc.setLineWidth(1);
      doc.line(20, 70, 190, 70);
      
      // Report details
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 105, 85, { align: 'center' });
      
      // Group information box
      doc.setFillColor(240, 248, 255);
      doc.rect(20, 100, 170, 50, 'F');
      doc.setDrawColor(59, 130, 246);
      doc.rect(20, 100, 170, 50, 'S');
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('Group Information', 25, 115);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Group Type: ${group.groupType || 'Standard'}`, 25, 125);
      doc.text(`Total Members: ${group.members.length}`, 25, 135);
      doc.text(`Description: ${group.description || 'No description'}`, 25, 145);
      
      // Summary metrics in a styled box
      doc.setFillColor(248, 250, 252);
      doc.rect(20, 160, 170, 60, 'F');
      doc.setDrawColor(100, 116, 139);
      doc.rect(20, 160, 170, 60, 'S');
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('Summary Metrics', 25, 175);
      
      const summaryData = [
        ['Total Spent', `$${analytics.totalSpent.toFixed(2)}`],
        ['Average per Person', `$${(analytics.totalSpent / group.members.length).toFixed(2)}`],
        ['Total Expenses', analytics.expenseCount.toString()],
        ['Categories Used', Object.keys(analytics.categorySpending).length.toString()]
      ];
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      let yPos = 185;
      summaryData.forEach((row, index) => {
        doc.text(`${row[0]}: ${row[1]}`, 25, yPos + (index * 8));
      });
      
      // New page for detailed analytics
      doc.addPage();
      
      // Page header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text('Detailed Analytics', 20, 20);
      doc.line(20, 25, 190, 25);
      
      let currentY = 40;
      
      if ((doc as any).autoTable) {
        // Member spending breakdown
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('Member Spending Breakdown', 20, currentY);
        
        const memberTableData = memberSpendingData.map(member => [
          member.name,
          `$${member.amount.toFixed(2)}`,
          `${member.percentage.toFixed(1)}%`
        ]);
        
        (doc as any).autoTable({
          head: [['Member Name', 'Amount Spent', 'Percentage of Total']],
          body: memberTableData,
          startY: currentY + 5,
          styles: { 
            fontSize: 9,
            cellPadding: 3,
            halign: 'center'
          },
          headStyles: { 
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [249, 250, 251] },
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 20;
        
        // Category spending breakdown
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('Category Spending Analysis', 20, currentY);
        
        const categoryTableData = categorySpendingData.map(category => [
          category.name,
          `$${category.amount.toFixed(2)}`,
          `${category.percentage.toFixed(1)}%`
        ]);
        
        (doc as any).autoTable({
          head: [['Category', 'Amount', 'Percentage of Total']],
          body: categoryTableData,
          startY: currentY + 5,
          styles: { 
            fontSize: 9,
            cellPadding: 3,
            halign: 'center'
          },
          headStyles: { 
            fillColor: [16, 185, 129],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [240, 253, 244] },
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 20;
        
        // Monthly trend
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('Monthly Spending Trend', 20, currentY);
        
        const monthlyTableData = monthlyData.map(month => [
          month.month,
          `$${month.amount.toFixed(2)}`,
          month.count.toString(),
          month.count > 0 ? `$${(month.amount / month.count).toFixed(2)}` : '$0.00'
        ]);
        
        (doc as any).autoTable({
          head: [['Month', 'Total Amount', 'Expense Count', 'Average per Expense']],
          body: monthlyTableData,
          startY: currentY + 5,
          styles: { 
            fontSize: 9,
            cellPadding: 3,
            halign: 'center'
          },
          headStyles: { 
            fillColor: [139, 92, 246],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        
        // New page for all expenses
        doc.addPage();
        
        // All expenses table
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('Complete Expense List', 20, 20);
        doc.line(20, 25, 190, 25);
        
        const allExpensesData = expenses
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map(expense => [
            expense.description,
            expense.category,
            `$${expense.amount.toFixed(2)}`,
            new Date(expense.date).toLocaleDateString(),
            expense.paidBy.name,
            expense.splitType || 'Equal'
          ]);
        
        (doc as any).autoTable({
          head: [['Description', 'Category', 'Amount', 'Date', 'Paid By', 'Split Type']],
          body: allExpensesData,
          startY: 35,
          styles: { 
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
            columnWidth: 'wrap'
          },
          headStyles: { 
            fillColor: [220, 38, 127],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          alternateRowStyles: { fillColor: [253, 242, 248] },
          columnStyles: {
            0: { columnWidth: 40 }, // Description
            1: { columnWidth: 25 }, // Category
            2: { columnWidth: 20 }, // Amount
            3: { columnWidth: 25 }, // Date
            4: { columnWidth: 25 }, // Paid By
            5: { columnWidth: 20 }  // Split Type
          }
        });
        
        // New page for group members
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('Group Members', 20, 20);
        doc.line(20, 25, 190, 25);
        
        const membersTableData = group.members.map(member => [
          member.name,
          member.email || 'N/A',
          member.role || 'Member',
          memberSpendingData.find(m => m.name === member.name)?.amount.toFixed(2) || '0.00'
        ]);
        
        (doc as any).autoTable({
          head: [['Name', 'Email', 'Role', 'Total Spent']],
          body: membersTableData,
          startY: 35,
          styles: { 
            fontSize: 10,
            cellPadding: 4,
            halign: 'center'
          },
          headStyles: { 
            fillColor: [245, 158, 11],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [255, 251, 235] },
        });
        
        // Chart data summary page
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('Chart Data Summary', 20, 20);
        doc.line(20, 25, 190, 25);
        
        // Add spending insights
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Key Insights:', 20, 40);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const topSpender = memberSpendingData[0];
        const topCategory = categorySpendingData[0];
        const highestMonth = monthlyData.reduce((max, month) => month.amount > max.amount ? month : max, monthlyData[0]);
        
        const insights = [
          `• Highest spender: ${topSpender?.name} with $${topSpender?.amount.toFixed(2)}`,
          `• Most expensive category: ${topCategory?.name} ($${topCategory?.amount.toFixed(2)})`,
          `• Peak spending month: ${highestMonth?.month} ($${highestMonth?.amount.toFixed(2)})`,
          `• Average expense amount: $${(analytics.totalSpent / analytics.expenseCount).toFixed(2)}`,
          `• Most active month: ${monthlyData.reduce((max, month) => month.count > max.count ? month : max, monthlyData[0])?.month} (${monthlyData.reduce((max, month) => month.count > max.count ? month : max, monthlyData[0])?.count} expenses)`
        ];
        
        let insightY = 50;
        insights.forEach((insight, index) => {
          doc.text(insight, 20, insightY + (index * 8));
        });
        
      } else {
        // Fallback without autoTable
        doc.setFontSize(10);
        summaryData.forEach((row, index) => {
          doc.text(`${row[0]}: ${row[1]}`, 20, currentY + (index * 10));
        });
      }
      
      // Footer on last page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated by Expense Tracker - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      }
      
      // Generate safe filename
      const safeFileName = group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeFileName}-complete-analytics-report.pdf`);
      
      console.log('Complete PDF export with all expenses completed successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  if (analytics.totalSpent === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Group Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No expenses to analyze</p>
            <p className="text-sm text-gray-500">Add some expenses to see analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={exportGroupAnalyticsToPDF}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Analytics PDF
        </Button>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  ${analytics.totalSpent.toFixed(2)}
                </div>
                <p className="text-sm text-gray-600">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  ${(analytics.totalSpent / group.members.length).toFixed(2)}
                </div>
                <p className="text-sm text-gray-600">Avg per Person</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.expenseCount}
                </div>
                <p className="text-sm text-gray-600">Total Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(analytics.categorySpending).length}
                </div>
                <p className="text-sm text-gray-600">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Spending */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {memberSpendingData.map((member, index) => (
                <div key={member.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-gray-600">
                      ${member.amount.toFixed(2)} ({member.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={member.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categorySpendingData.map((category, index) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-gray-600">
                      ${category.amount.toFixed(2)} ({category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Category Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={categorySpendingData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="amount"
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                >
                  {categorySpendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
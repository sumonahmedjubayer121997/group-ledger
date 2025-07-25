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
      
      // Header
      doc.setFontSize(20);
      doc.text(`${group.name} - Analytics Report`, 20, 20);
      
      // Group Info
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
      doc.text(`Group Type: ${group.groupType || 'Standard'}`, 20, 45);
      doc.text(`Total Members: ${group.members.length}`, 20, 55);
      doc.text(`Group Description: ${group.description || 'No description'}`, 20, 65);
      
      // Summary metrics
      doc.setFontSize(14);
      doc.text('Summary Metrics', 20, 85);
      
      const summaryData = [
        ['Total Spent', `$${analytics.totalSpent.toFixed(2)}`],
        ['Average per Person', `$${(analytics.totalSpent / group.members.length).toFixed(2)}`],
        ['Total Expenses', analytics.expenseCount.toString()],
        ['Categories Used', Object.keys(analytics.categorySpending).length.toString()]
      ];
      
      // Use jsPDF autoTable if available, otherwise create simple table
      if ((doc as any).autoTable) {
        (doc as any).autoTable({
          body: summaryData,
          startY: 95,
          styles: { fontSize: 10 },
          theme: 'grid'
        });
        
        // Member spending breakdown
        let finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.text('Member Spending Breakdown', 20, finalY);
        
        const memberTableData = memberSpendingData.map(member => [
          member.name,
          `$${member.amount.toFixed(2)}`,
          `${member.percentage.toFixed(1)}%`
        ]);
        
        (doc as any).autoTable({
          head: [['Member Name', 'Amount Spent', 'Percentage']],
          body: memberTableData,
          startY: finalY + 10,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        
        // Category spending breakdown
        finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.text('Category Spending Breakdown', 20, finalY);
        
        const categoryTableData = categorySpendingData.map(category => [
          category.name,
          `$${category.amount.toFixed(2)}`,
          `${category.percentage.toFixed(1)}%`
        ]);
        
        (doc as any).autoTable({
          head: [['Category', 'Amount', 'Percentage']],
          body: categoryTableData,
          startY: finalY + 10,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [16, 185, 129] },
        });
        
        // Monthly trend
        finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.text('Monthly Spending Trend', 20, finalY);
        
        const monthlyTableData = monthlyData.map(month => [
          month.month,
          `$${month.amount.toFixed(2)}`,
          month.count.toString()
        ]);
        
        (doc as any).autoTable({
          head: [['Month', 'Amount', 'Expense Count']],
          body: monthlyTableData,
          startY: finalY + 10,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [139, 92, 246] },
        });
        
        // Group members list
        finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.text('Group Members', 20, finalY);
        
        const membersTableData = group.members.map(member => [
          member.name,
          member.email || 'N/A',
          member.role || 'Member'
        ]);
        
        (doc as any).autoTable({
          head: [['Name', 'Email', 'Role']],
          body: membersTableData,
          startY: finalY + 10,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [245, 158, 11] },
        });
      } else {
        // Fallback without autoTable
        let yPos = 100;
        doc.setFontSize(10);
        summaryData.forEach((row, index) => {
          doc.text(`${row[0]}: ${row[1]}`, 20, yPos + (index * 10));
        });
        
        yPos += 60;
        doc.setFontSize(14);
        doc.text('Member Spending:', 20, yPos);
        yPos += 15;
        doc.setFontSize(10);
        memberSpendingData.forEach((member, index) => {
          doc.text(`${member.name}: $${member.amount.toFixed(2)} (${member.percentage.toFixed(1)}%)`, 20, yPos + (index * 10));
        });
      }
      
      // Generate safe filename
      const safeFileName = group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeFileName}-analytics-report.pdf`);
      
      console.log('PDF export completed successfully');
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
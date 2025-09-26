import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Expense } from "@/stores/expenseStore";
import {
  TrendingUp,
  PieChart as PieChartIcon,
  Download,
  Calendar,
  DollarSign,
  AlertCircle,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  format,
  subMonths,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";

interface ExpenseChartProps {
  expenses: Expense[];
  theme?: "light" | "dark";
}

// Theme-aware color palettes
const COLORS_LIGHT = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
  "#EC4899",
  "#F97316",
  "#6366F1",
];
const COLORS_DARK = [
  "#60A5FA",
  "#34D399",
  "#FBBF24",
  "#F87171",
  "#A78BFA",
  "#22D3EE",
  "#A3E635",
  "#F472B6",
  "#FB923C",
  "#818CF8",
];

// Theme-aware text colors
const TEXT_COLORS = {
  light: {
    primary: "text-gray-900",
    secondary: "text-gray-600",
    muted: "text-gray-500",
    card: "bg-white",
    border: "border-gray-200",
    hover: "hover:bg-gray-50",
    button: "hover:bg-gray-100",
    chartGrid: "#E5E7EB",
    chartAxis: "#6B7280",
    chartTooltip: "bg-white",
    chartTooltipBorder: "border-gray-200",
    chartTooltipText: "text-gray-900",
    badge: "bg-gray-100 text-gray-800",
    summaryCard: "bg-blue-50 border-blue-100",
    summaryText: "text-blue-700",
    pieLabel: "#1F2937",
  },
  dark: {
    primary: "text-gray-100",
    secondary: "text-gray-300",
    muted: "text-gray-400",
    card: "bg-gray-800",
    border: "border-gray-700",
    hover: "hover:bg-gray-700",
    button: "hover:bg-gray-700",
    chartGrid: "#374151",
    chartAxis: "#9CA3AF",
    chartTooltip: "bg-gray-800",
    chartTooltipBorder: "border-gray-700",
    chartTooltipText: "text-gray-100",
    badge: "bg-gray-700 text-gray-200",
    summaryCard: "bg-blue-900/30 border-blue-800",
    summaryText: "text-blue-300",
    pieLabel: "#F9FAFB",
  },
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, theme }: any) => {
  if (active && payload && payload.length) {
    const colors = TEXT_COLORS[theme];
    return (
      <div
        className={`${colors.chartTooltip} ${colors.chartTooltipBorder} shadow-lg rounded-md p-3 border`}
      >
        <p className={`font-medium ${colors.chartTooltipText}`}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${Number(entry.value).toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Summary stats component
const SummaryStats = ({
  expenses,
  theme,
}: {
  expenses: Expense[];
  theme: "light" | "dark";
}) => {
  const colors = TEXT_COLORS[theme];
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const maxExpense =
    expenses.length > 0 ? Math.max(...expenses.map((exp) => exp.amount)) : 0;
  const minExpense =
    expenses.length > 0 ? Math.min(...expenses.map((exp) => exp.amount)) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className={`${colors.summaryCard} p-4 rounded-lg border`}>
        <div className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-blue-500" />
          <span className={`text-sm ${colors.secondary}`}>Total</span>
        </div>
        <p className={`text-xl font-bold ${colors.summaryText} mt-1`}>
          ${totalExpenses.toFixed(2)}
        </p>
      </div>
      <div className={`${colors.summaryCard} p-4 rounded-lg border`}>
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-green-500" />
          <span className={`text-sm ${colors.secondary}`}>Average</span>
        </div>
        <p className={`text-xl font-bold ${colors.summaryText} mt-1`}>
          ${avgExpense.toFixed(2)}
        </p>
      </div>
      <div className={`${colors.summaryCard} p-4 rounded-lg border`}>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-yellow-500" />
          <span className={`text-sm ${colors.secondary}`}>Highest</span>
        </div>
        <p className={`text-xl font-bold ${colors.summaryText} mt-1`}>
          ${maxExpense.toFixed(2)}
        </p>
      </div>
      <div className={`${colors.summaryCard} p-4 rounded-lg border`}>
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          <span className={`text-sm ${colors.secondary}`}>Count</span>
        </div>
        <p className={`text-xl font-bold ${colors.summaryText} mt-1`}>
          {expenses.length}
        </p>
      </div>
    </div>
  );
};

// Category breakdown component
const CategoryBreakdown = ({
  categoryData,
  theme,
}: {
  categoryData: Record<string, number>;
  theme: "light" | "dark";
}) => {
  const colors = TEXT_COLORS[theme];
  const total = Object.values(categoryData).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const colorPalette = theme === "light" ? COLORS_LIGHT : COLORS_DARK;

  return (
    <div className="mb-6">
      <h3 className={`text-lg font-semibold mb-3 ${colors.primary}`}>
        Category Breakdown
      </h3>
      <div className="space-y-2">
        {Object.entries(categoryData)
          .sort(([, a], [, b]) => b - a)
          .map(([category, amount]) => {
            const percentage = (amount / total) * 100;
            const colorIndex =
              Object.keys(categoryData).indexOf(category) % colorPalette.length;
            return (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorPalette[colorIndex] }}
                  />
                  <span className={`text-sm font-medium ${colors.primary}`}>
                    {category}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${colors.secondary}`}>
                    ${amount.toFixed(2)}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`${colors.badge} text-xs`}
                  >
                    {percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

// Export modal component
const ExportModal = ({
  expenses,
  onClose,
  theme,
}: {
  expenses: Expense[];
  onClose: () => void;
  theme: "light" | "dark";
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<"pdf" | "csv">("pdf");
  const colors = TEXT_COLORS[theme];

  const handleExport = async () => {
    setIsExporting(true);

    try {
      if (exportType === "pdf") {
        await exportToPDF(expenses);
      } else {
        await exportToCSV(expenses);
      }
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`${colors.card} p-6 rounded-lg shadow-xl max-w-md w-full`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${colors.primary}`}>
          Export Analytics
        </h3>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${colors.primary}`}>
            Export Format
          </label>
          <div className="flex space-x-4">
            <Button
              variant={exportType === "pdf" ? "default" : "outline"}
              onClick={() => setExportType("pdf")}
              className="flex-1"
            >
              PDF Report
            </Button>
            <Button
              variant={exportType === "csv" ? "default" : "outline"}
              onClick={() => setExportType("csv")}
              className="flex-1"
            >
              CSV Data
            </Button>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ExpenseChart: React.FC<ExpenseChartProps> = ({
  expenses,
  theme = "light",
}) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [timeRange, setTimeRange] = useState<"month" | "quarter" | "year">(
    "month"
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const colors = TEXT_COLORS[theme];

  // Filter expenses based on time range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "month":
        startDate = startOfMonth(now);
        break;
      case "quarter":
        startDate = startOfMonth(subMonths(now, 3));
        break;
      case "year":
        startDate = startOfMonth(subMonths(now, 12));
        break;
      default:
        startDate = startOfMonth(now);
    }

    return expenses.filter((expense) =>
      isWithinInterval(new Date(expense.date), { start: startDate, end: now })
    );
  }, [expenses, timeRange]);

  // Group expenses by category
  const categoryData = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || "Other";
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredExpenses]);

  // Group expenses by month
  const monthlyData = useMemo(() => {
    const monthlyExpenses = filteredExpenses.reduce((acc, expense) => {
      const month = format(new Date(expense.date), "MMM yyyy");
      acc[month] = (acc[month] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyExpenses).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedMonths.map((month) => ({
      month,
      amount: monthlyExpenses[month],
    }));
  }, [filteredExpenses]);

  // Prepare data for radar chart (comparison across categories)
  const radarData = useMemo(() => {
    const totalAmount = Object.values(categoryData).reduce(
      (sum, amount) => sum + amount,
      0
    );
    return Object.entries(categoryData).map(([name, value]) => ({
      category: name,
      amount: value,
      percentage: totalAmount > 0 ? (value / totalAmount) * 100 : 0,
    }));
  }, [categoryData]);

  // Export to PDF function
  const exportToPDF = async (expensesToExport: Expense[]) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("Expense Analytics Report", 20, 20);

    // Date and filters
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(
      `Time Range: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`,
      20,
      40
    );
    doc.text(`Total Expenses: ${expensesToExport.length}`, 20, 50);
    doc.text(
      `Total Amount: $${expensesToExport
        .reduce((sum, exp) => sum + exp.amount, 0)
        .toFixed(2)}`,
      20,
      60
    );

    // Summary stats
    const summaryY = 80;
    doc.setFontSize(14);
    doc.text("Summary Statistics", 20, summaryY);

    const totalAmount = expensesToExport.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const avgAmount =
      expensesToExport.length > 0 ? totalAmount / expensesToExport.length : 0;
    const maxAmount =
      expensesToExport.length > 0
        ? Math.max(...expensesToExport.map((exp) => exp.amount))
        : 0;

    doc.setFontSize(10);
    doc.text(`Average Expense: $${avgAmount.toFixed(2)}`, 20, summaryY + 10);
    doc.text(`Highest Expense: $${maxAmount.toFixed(2)}`, 20, summaryY + 20);

    // Category breakdown table
    let currentY = summaryY + 40;
    doc.setFontSize(14);
    doc.text("Expense Breakdown by Category", 20, currentY);

    const categoryTableData = Object.entries(categoryData).map(
      ([category, amount]) => [
        category,
        `$${amount.toFixed(2)}`,
        `${((amount / totalAmount) * 100).toFixed(1)}%`,
      ]
    );

    (doc as any).autoTable({
      head: [["Category", "Amount", "Percentage"]],
      body: categoryTableData,
      startY: currentY + 10,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Monthly breakdown
    currentY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text("Monthly Spending Trend", 20, currentY);

    const monthlyTableData = Object.entries(monthlyData).map(
      ([month, amount]) => [month, `$${amount.toFixed(2)}`]
    );

    (doc as any).autoTable({
      head: [["Month", "Amount"]],
      body: monthlyTableData,
      startY: currentY + 10,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    // Recent expenses
    currentY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text("Recent Expenses", 20, currentY);

    const recentExpenses = expensesToExport
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15)
      .map((expense) => [
        expense.description,
        expense.category,
        `$${expense.amount.toFixed(2)}`,
        new Date(expense.date).toLocaleDateString(),
        expense.paidBy.name,
      ]);

    (doc as any).autoTable({
      head: [["Description", "Category", "Amount", "Date", "Paid By"]],
      body: recentExpenses,
      startY: currentY + 10,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] },
    });

    doc.save("expense-analytics.pdf");
  };

  // Export to CSV function
  const exportToCSV = (expensesToExport: Expense[]) => {
    const headers = [
      "Date",
      "Description",
      "Category",
      "Amount",
      "Paid By",
      "Payment Method",
    ];

    const csvContent = [
      headers.join(","),
      ...expensesToExport.map((expense) =>
        [
          expense.date,
          `"${expense.description}"`,
          expense.category,
          expense.amount,
          expense.paidBy.name,
          expense.paymentMethod,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "expenses.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get chart colors based on theme
  const chartColors = theme === "light" ? COLORS_LIGHT : COLORS_DARK;

  if (expenses.length === 0) {
    return (
      <Card className={`${colors.card} shadow-lg border ${colors.border}`}>
        <CardHeader>
          <CardTitle
            className={`flex items-center space-x-2 ${colors.primary}`}
          >
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span>Expense Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <PieChartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className={`text-gray-600 mb-2 ${colors.secondary}`}>
              No data to display
            </p>
            <p className={`text-sm ${colors.muted}`}>
              Add expenses to see analytics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${colors.card} shadow-lg border ${colors.border}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle
            className={`flex items-center space-x-2 ${colors.primary}`}
          >
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span>Expense Analytics</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className={`flex items-center gap-2 ${colors.button}`}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {(["month", "quarter", "year"] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={timeRange === range ? "" : `${colors.button}`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
          {selectedCategory && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className={`${colors.badge}`}>
                {selectedCategory}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={`${colors.button}`}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <SummaryStats expenses={filteredExpenses} theme={theme} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Pie Chart */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${colors.primary}`}>
              By Category
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.entries(categoryData).map(([name, value]) => ({
                    name,
                    value,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, x, y }) => (
                    <text
                      x={x}
                      y={y}
                      fill={colors.pieLabel}
                      fontSize={12}
                      textAnchor="middle"
                    >
                      {`${name} ${(percent * 100).toFixed(0)}%`}
                    </text>
                  )}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data) => setSelectedCategory(data.name)}
                  labelStyle={{ fill: colors.pieLabel, fontSize: 12 }}
                >
                  {Object.entries(categoryData).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip theme={theme} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Bar Chart */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${colors.primary}`}>
              Monthly Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.chartGrid}
                />
                <XAxis dataKey="month" stroke={colors.chartAxis} />
                <YAxis stroke={colors.chartAxis} />
                <Tooltip content={<CustomTooltip theme={theme} />} />
                <Bar dataKey="amount" fill={chartColors[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Radar Chart for Category Comparison */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${colors.primary}`}>
              Category Comparison
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke={colors.chartGrid} />
                <PolarAngleAxis dataKey="category" stroke={colors.chartAxis} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, "dataMax + 20"]}
                  stroke={colors.chartAxis}
                />
                <Radar
                  name="Amount"
                  dataKey="amount"
                  stroke={chartColors[0]}
                  fill={chartColors[0]}
                  fillOpacity={0.3}
                />
                <Tooltip content={<CustomTooltip theme={theme} />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown List */}
          <div>
            <CategoryBreakdown categoryData={categoryData} theme={theme} />
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <ExportModal
            expenses={filteredExpenses}
            onClose={() => setShowExportModal(false)}
            theme={theme}
          />
        )}
      </CardContent>
    </Card>
  );
};

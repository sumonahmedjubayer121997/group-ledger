import { formatCalendarDate } from "@/lib/dates";
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useExpenseStore, Group } from "@/stores/expenseStore";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Download,
  Currency,
  Check,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore"; // <-- Import your settings store
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from "recharts";
import "jspdf-autotable";
import { formatAmount } from "@/lib/money";
import { useGroupLedger } from "@/stores/useLedger";
import { fetchGroupById, getUserProfile } from "@/services/firebaseService";
import { set } from "date-fns";

interface GroupAnalyticsProps {
  group: Group;
}

// Helper component for user avatar
const UserAvatar: React.FC<{
  member: any;
  name: string;
  bgColor: string;
  textColor: string;
}> = ({ member, name, bgColor, textColor }) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center overflow-hidden`}
    >
      {member?.photoURL && !imageError ? (
        <img
          src={member.photoURL}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={`${textColor} text-sm font-medium`}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// Helper: Format currency
// Helper: Format currency
const formatCurrency = (amount: number, currency: string): string =>
  formatAmount(amount, currency);

// ...existing code...

// Helper: Safe filename
function getSafeFileName(name: string) {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

export const GroupAnalytics: React.FC<GroupAnalyticsProps> = ({ group }) => {
  const { getGroupAnalytics, getGroupExpenses } = useExpenseStore();
  const analytics = getGroupAnalytics(group.id);
  const expenses = getGroupExpenses(group.id);
  const [groupInfo, setGroupInfo] = React.useState<Group | null>(null);
  const [currency, setCurrency] = React.useState<string>(group.settings?.currency ?? "");
  const [userProfiles, setUserProfiles] = React.useState<Record<string, any>>(
    {}
  );

  // Debug logs
  console.log("🔍 GroupAnalytics Debug:");
  console.log("- Group prop:", group);
  console.log("- Analytics data:", analytics);
  console.log("- Expenses data:", expenses);
  console.log("- Group members:", group.members);
  console.log("- User profiles:", userProfiles);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔍 Fetching group data for ID:", group.id);
        const fetchedGroup = await fetchGroupById(group.id);
        if (!fetchedGroup) {
          console.error(`❌ Group with ID ${group.id} not found`);
          return;
        }
        setCurrency(fetchedGroup.settings.currency);
        setGroupInfo(fetchedGroup);
        console.log("✅ Fetched group info:", fetchedGroup);
        console.log("💰 Currency set to:", fetchedGroup.settings.currency);
      } catch (error) {
        console.error("❌ Error fetching group info:", error);
      }
    };

    fetchData();
  }, [group.id]);

  // New useEffect to fetch user profiles for all group members
  React.useEffect(() => {
    const fetchUserProfiles = async () => {
      try {
        console.log("🔍 Fetching user profiles for group members...");
        const profiles: Record<string, any> = {};

        for (const member of group.members) {
          const userId = member.id || member.userId;
          if (userId) {
            console.log(`🔍 Fetching profile for user ID: ${userId}`);
            const userProfile = await getUserProfile(userId);
            if (userProfile) {
              profiles[userId] = userProfile;
              console.log(`✅ User Profile for ${userId}:`, {
                name: userProfile.name,
                email: userProfile.email,
                photoURL: userProfile.photoURL,
                fullProfile: userProfile,
              });
            } else {
              console.log(`❌ No profile found for user ID: ${userId}`);
            }
          }
        }

        setUserProfiles(profiles);
        console.log("✅ All user profiles fetched:", profiles);
      } catch (error) {
        console.error("❌ Error fetching user profiles:", error);
      }
    };

    if (group.members && group.members.length > 0) {
      fetchUserProfiles();
    }
  }, [group.members]);

  // Prepare member spending data
  const memberSpendingData = React.useMemo(() => {
    try {
      console.log("🔍 Preparing member spending data...");
      const data = Object.entries(analytics.memberSpending)
        .map(([memberId, amount]) => {
          const member = group.members.find((m) => m.id === memberId);
          const userProfile = userProfiles[memberId];
          const numAmount = Number(amount);

          console.log(
            `- Member ${memberId}: ${
              member?.name || "Unknown"
            } spent ${numAmount}`
          );
          if (userProfile) {
            console.log(`  📸 PhotoURL: ${userProfile.photoURL || "No photo"}`);
            console.log(`  📧 Email: ${userProfile.email}`);
          } else {
            console.log(`  ❌ No user profile loaded for ${memberId}`);
          }

          return {
            name: member?.name || "Unknown",
            amount: numAmount,
            percentage:
              analytics.totalSpent > 0
                ? (numAmount / analytics.totalSpent) * 100
                : 0,
            photoURL: userProfile?.photoURL,
            email: userProfile?.email,
            memberId: memberId,
          };
        })
        .sort((a, b) => b.amount - a.amount);
      console.log("✅ Member spending data prepared:", data);
      return data;
    } catch (error) {
      console.error("❌ Error preparing member spending data:", error);
      return [];
    }
  }, [
    analytics.memberSpending,
    analytics.totalSpent,
    group.members,
    userProfiles,
  ]);

  // Prepare category spending data
  const categorySpendingData = React.useMemo(
    () =>
      Object.entries(analytics.categorySpending)
        .map(([category, amount]) => {
          const numAmount = Number(amount);
          return {
            name: category.trim() ? category.charAt(0).toUpperCase() + category.slice(1) : 'Uncategorised',
            amount: numAmount,
            percentage: (numAmount / analytics.totalSpent) * 100,
          };
        })
        .sort((a, b) => b.amount - a.amount),
    [analytics.categorySpending, analytics.totalSpent]
  );

  // Settlement summary: the fewest payments that settle the group, from the shared ledger
  const ledgerView = useGroupLedger(group.id);
  const transfers = (ledgerView?.ledger.simplified ?? []).map((d) => ({
    from: d.from,
    to: d.to,
    amount: d.cents / 100,
  }));

  // Monthly spending trend (last 6 months)
  const monthlyData = React.useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return (
          expenseDate.getMonth() === month.getMonth() &&
          expenseDate.getFullYear() === month.getFullYear()
        );
      });
      months.push({
        month: month.toLocaleString("default", { month: "short" }),
        amount: monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        count: monthExpenses.length,
      });
    }
    return months;
  }, [expenses]);

  // --- FIX: Calculate avg per person based on actual group members, avoid division by zero ---
  const memberCount = group.members.length > 0 ? group.members.length : 1;
  const avgPerPerson = analytics.totalSpent / memberCount;

  // Calculate expense analytics
  const expenseAnalytics = React.useMemo(() => {
    if (expenses.length === 0) {
      return {
        avgPerDay: 0,
        avgPerWeek: 0,
        lastWeekExpenses: 0,
        totalDays: 0,
        totalWeeks: 0,
      };
    }

    const now = new Date();

    // Get date range of expenses
    const expenseDates = expenses.map((e) => new Date(e.date));
    const oldestDate = new Date(
      Math.min(...expenseDates.map((d) => d.getTime()))
    );
    const newestDate = new Date(
      Math.max(...expenseDates.map((d) => d.getTime()))
    );

    // Calculate total days and weeks
    const totalDays = Math.max(
      1,
      Math.ceil(
        (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

    // Calculate averages
    const avgPerDay = analytics.totalSpent / totalDays;
    const avgPerWeek = analytics.totalSpent / totalWeeks;

    // Calculate last week expenses (Monday to Sunday)
    const lastWeekStart = new Date(now);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
    lastWeekStart.setDate(now.getDate() - daysToLastMonday - 7); // Go to last Monday
    lastWeekStart.setHours(0, 0, 0, 0);

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6); // Sunday
    lastWeekEnd.setHours(23, 59, 59, 999);

    const lastWeekExpenses = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= lastWeekStart && expenseDate <= lastWeekEnd;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate running week expenses (Current Monday to today)
    const runningWeekStart = new Date(now);
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToCurrentMonday =
      currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // If Sunday, go back 6 days to Monday
    runningWeekStart.setDate(now.getDate() - daysToCurrentMonday); // Go to this Monday
    runningWeekStart.setHours(0, 0, 0, 0);

    const runningWeekEnd = new Date(now);
    runningWeekEnd.setHours(23, 59, 59, 999); // Until now

    const runningWeekExpenses = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= runningWeekStart && expenseDate <= runningWeekEnd;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      avgPerDay,
      avgPerWeek,
      lastWeekExpenses,
      runningWeekExpenses,
      totalDays,
      totalWeeks,
      lastWeekStart,
      lastWeekEnd,
      runningWeekStart,
      runningWeekEnd,
    };
  }, [expenses, analytics.totalSpent]);

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
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No expenses to analyze</p>
            <p className="text-sm text-muted-foreground">
              Add some expenses to see analytics
            </p>
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
          onClick={async () => {
            // The PDF tools (jsPDF, html2canvas, Chart.js) download only when someone exports.
            const { default: exportGroupAnalyticsToPDF } = await import("./ExportGroupAnalyticsToPDF");
            await exportGroupAnalyticsToPDF({
              group,
              analytics,
              expenses,
              memberSpendingData,
              categorySpendingData,
              monthlyData,
            });
          }}
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
              <DollarSign className="w-5 h-5 text-settled" />
              <div>
                <div className="text-2xl font-bold text-settled">
                  {formatCurrency(analytics.totalSpent, currency)}
                </div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {formatCurrency(avgPerPerson, currency)}
                </div>
                <p className="text-sm text-muted-foreground">Avg per Person</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {analytics.expenseCount}
                </div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-owes" />
              <div>
                <div className="text-2xl font-bold text-owes">
                  {Object.keys(analytics.categorySpending).length}
                </div>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-xl font-bold text-muted-foreground">
                  {formatCurrency(expenseAnalytics.avgPerDay, currency)}
                </div>
                <p className="text-sm text-muted-foreground">Avg Expense per Day</p>
                <p className="text-xs text-muted-foreground">
                  Over {expenseAnalytics.totalDays} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-xl font-bold text-muted-foreground">
                  {formatCurrency(expenseAnalytics.avgPerWeek, currency)}
                </div>
                <p className="text-sm text-muted-foreground">Avg Expense per Week</p>
                <p className="text-xs text-muted-foreground">
                  Over {expenseAnalytics.totalWeeks} weeks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-settled" />
              <div>
                <div className="text-xl font-bold text-settled">
                  {formatCurrency(expenseAnalytics.lastWeekExpenses, currency)}
                </div>
                <p className="text-sm text-muted-foreground">Last Week Expenses</p>
                <p className="text-xs text-muted-foreground">
                  {expenseAnalytics.lastWeekStart &&
                    `${formatCalendarDate(expenseAnalytics.lastWeekStart)} - ${formatCalendarDate(expenseAnalytics.lastWeekEnd)}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-owes" />
              <div>
                <div className="text-xl font-bold text-owes">
                  {formatCurrency(
                    expenseAnalytics.runningWeekExpenses,
                    currency
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Running Week Expenses</p>
                <p className="text-xs text-muted-foreground">
                  {expenseAnalytics.runningWeekStart &&
                    `${formatCalendarDate(expenseAnalytics.runningWeekStart)} - Today`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Spending */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              Spending by Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              {memberSpendingData.map((member, index) => (
                <div key={member.name} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="font-medium text-foreground">
                        {member.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        {formatCurrency(member.amount, currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.percentage.toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={member.percentage}
                    aria-label={`${member.name}: ${member.percentage.toFixed(0)}% of spending`}
                    className="h-2"
                    style={{
                      backgroundColor: `${COLORS[index % COLORS.length]}20`,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-border my-6"></div>

            {/* Settlement Summary Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-settled" />
                <h3 className="text-lg font-semibold text-foreground">
                  Settlement Summary
                </h3>
              </div>

              {transfers.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 bg-settled/10 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-settled" aria-hidden="true" />
                  </div>
                  <p className="text-settled font-medium">
                    Everyone is settled!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No pending settlements required
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transfers.map((t, idx) => {
                    const fromMember = group.members.find(
                      (m) => m.id === t.from
                    );
                    const toMember = group.members.find((m) => m.id === t.to);
                    const from = fromMember?.name || ledgerView?.person(t.from).name || t.from;
                    const to = toMember?.name || ledgerView?.person(t.to).name || t.to;

                    // Get photo URLs from userProfiles
                    const fromMemberWithPhoto = fromMember
                      ? {
                          ...fromMember,
                          photoURL: userProfiles[t.from]?.photoURL,
                        }
                      : null;

                    const toMemberWithPhoto = toMember
                      ? {
                          ...toMember,
                          photoURL: userProfiles[t.to]?.photoURL,
                        }
                      : null;

                    return (
                      <div
                        key={idx}
                        className="bg-muted/50 rounded-lg p-3 border border-border"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              member={fromMemberWithPhoto}
                              name={from}
                              bgColor="bg-secondary"
                              textColor="text-muted-foreground"
                            />
                            <span className="text-muted-foreground">→</span>
                            <UserAvatar
                              member={toMemberWithPhoto}
                              name={to}
                              bgColor="bg-settled/10"
                              textColor="text-settled"
                            />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-foreground">
                              <strong>{from}</strong> owes <strong>{to}</strong>
                            </div>
                            <div className="text-lg font-bold text-destructive">
                              {formatCurrency(t.amount, currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
              {categorySpendingData.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(category.amount, currency)} (
                      {category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={category.percentage} className="h-2" aria-label={`${category.name}: ${category.percentage.toFixed(0)}% of spending`} />
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
          <div className="h-64" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value, currency),
                    "Amount",
                  ]}
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
          <div className="h-64" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  rootTabIndex={-1}
                  data={categorySpendingData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="amount"
                  label={({ name, percentage }) =>
                    `${name} (${percentage.toFixed(1)}%)`
                  }
                >
                  {categorySpendingData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value, currency),
                    "Amount",
                  ]}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

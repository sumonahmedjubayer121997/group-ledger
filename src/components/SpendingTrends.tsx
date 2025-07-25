import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Expense } from '@/stores/expenseStore';
import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign } from 'lucide-react';

interface SpendingTrendsProps {
  expenses: Expense[];
}

export const SpendingTrends: React.FC<SpendingTrendsProps> = ({ expenses }) => {
  // Calculate daily spending for the last 30 days
  const last30DaysData = React.useMemo(() => {
    const days = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayExpenses = expenses.filter(expense => 
        expense.date.toISOString().split('T')[0] === dateStr
      );
      
      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: dayExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        count: dayExpenses.length,
      });
    }
    
    return days;
  }, [expenses]);

  // Calculate trends and insights
  const currentWeekSpending = last30DaysData.slice(-7).reduce((sum, day) => sum + day.amount, 0);
  const previousWeekSpending = last30DaysData.slice(-14, -7).reduce((sum, day) => sum + day.amount, 0);
  const weeklyChange = previousWeekSpending === 0 ? 0 : ((currentWeekSpending - previousWeekSpending) / previousWeekSpending) * 100;

  const avgDailySpending = last30DaysData.reduce((sum, day) => sum + day.amount, 0) / 30;
  const highestSpendingDay = last30DaysData.reduce((max, day) => day.amount > max.amount ? day : max, last30DaysData[0] || { amount: 0, date: '' });

  // Peak spending hours analysis
  const hourlyData = React.useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      amount: 0,
      count: 0,
    }));

    expenses.forEach(expense => {
      const hour = new Date(expense.date).getHours();
      hours[hour].amount += expense.amount;
      hours[hour].count += 1;
    });

    return hours.map(hour => ({
      time: `${hour.hour.toString().padStart(2, '0')}:00`,
      amount: hour.amount,
      count: hour.count,
    })).filter(hour => hour.amount > 0);
  }, [expenses]);

  const getTrendIcon = () => {
    if (weeklyChange > 5) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (weeklyChange < -5) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (weeklyChange > 5) return 'text-red-600';
    if (weeklyChange < -5) return 'text-green-600';
    return 'text-gray-600';
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Spending Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No spending data available</p>
            <p className="text-sm text-gray-500">Add some expenses to see trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Spending Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">
              ${avgDailySpending.toFixed(2)}
            </div>
            <div className="text-xs text-blue-600">Avg Daily</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-semibold text-purple-600">
              ${currentWeekSpending.toFixed(2)}
            </div>
            <div className="text-xs text-purple-600">This Week</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-semibold text-orange-600">
              ${highestSpendingDay.amount.toFixed(2)}
            </div>
            <div className="text-xs text-orange-600">Peak Day</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={`text-lg font-semibold flex items-center justify-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              {Math.abs(weeklyChange).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Weekly Change</div>
          </div>
        </div>

        {/* Trend Badge */}
        <div className="flex justify-center">
          <Badge variant={weeklyChange > 5 ? "destructive" : weeklyChange < -5 ? "default" : "secondary"}>
            {weeklyChange > 5 ? "📈 Spending Increased" : 
             weeklyChange < -5 ? "📉 Spending Decreased" : 
             "➡️ Spending Stable"}
          </Badge>
        </div>

        {/* 30-Day Trend Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Daily Spending (Last 30 Days)
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30DaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours Analysis */}
        {hourlyData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Peak Spending Hours
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Quick Insights */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">💡 Quick Insights</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>• Your highest spending day was {highestSpendingDay.date}</p>
            <p>• You spend an average of ${avgDailySpending.toFixed(2)} per day</p>
            {weeklyChange > 10 && <p>• ⚠️ Spending increased significantly this week</p>}
            {weeklyChange < -10 && <p>• ✅ Great job reducing spending this week!</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpendingTrends;
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBudgetStore } from "@/stores/budgetStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { AlertTriangle, TrendingUp, Target, DollarSign } from "lucide-react";
import { Group } from "@/stores/expenseStore";

interface GroupBudgetAlertsProps {
  group: Group;
  onManageBudgets?: () => void;
}

export const GroupBudgetAlerts: React.FC<GroupBudgetAlertsProps> = ({
  group,
  onManageBudgets,
}) => {
  const { getAllGroupBudgets, getBudgetUsage } = useBudgetStore();
  const { expenses } = useExpenseStore();

  const groupBudgets = getAllGroupBudgets(group.id);
  const activeBudgets = groupBudgets.filter((budget) => budget.isActive);
  const groupExpenses = expenses.filter(
    (expense) => expense.groupId === group.id
  );
  const budgetUsages = getBudgetUsage(groupExpenses, undefined, group.id);

  const overBudgetUsages = budgetUsages.filter((usage) => usage.isOverBudget);
  const nearLimitUsages = budgetUsages.filter(
    (usage) => usage.isNearLimit && !usage.isOverBudget
  );

  // If no active budgets, show a prompt to create one
  if (activeBudgets.length === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="p-4 text-center">
          <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">
            No budgets set for this group
          </p>
          {onManageBudgets && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManageBudgets}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Target className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // If no alerts, show all good status with budget summary
  if (overBudgetUsages.length === 0 && nearLimitUsages.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-700 font-medium">
                All budgets are on track
              </span>
              <Badge
                variant="outline"
                className="text-green-600 border-green-200"
              >
                {activeBudgets.length} active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Show budget summary */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Budget Overview
            </h4>
            <div className="space-y-3">
              {activeBudgets.map((budget) => {
                const usage = budgetUsages.find(
                  (u) => u.budgetId === budget.id
                );
                const spent = usage?.spent || 0;
                const percentage = usage?.percentage || 0;
                const remaining = budget.limit - spent;

                return (
                  <div
                    key={budget.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-medium text-gray-900">
                          {budget.name}
                        </h5>
                        <Badge variant="outline" className="text-xs">
                          {budget.category === "overall"
                            ? "Overall"
                            : budget.category || "Overall"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {group.settings.currency} {spent.toFixed(2)} of{" "}
                        {group.settings.currency} {budget.limit.toFixed(2)} •{" "}
                        {budget.period}
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {percentage.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {group.settings.currency} {remaining.toFixed(2)} left
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {onManageBudgets && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onManageBudgets}
                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Manage Budgets
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Over Budget Alerts - Matching the design from the image */}
      {overBudgetUsages.map((usage) => {
        const budget = activeBudgets.find((b) => b.id === usage.budgetId);
        if (!budget) return null;

        const overage = usage.spent - budget.limit;

        return (
          <div
            key={budget.id}
            className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => onManageBudgets?.()}
          >
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-red-800 font-semibold text-base mb-1">
                Budget Exceeded: {budget.name}
              </h3>
              <div className="space-y-1">
                <p className="text-red-700 text-sm">
                  Spent:{" "}
                  <span className="font-semibold">
                    {group.settings.currency} {usage.spent.toFixed(2)}
                  </span>
                  of {group.settings.currency} {budget.limit.toFixed(2)} limit
                </p>
                <p className="text-red-700 text-sm">
                  Over by:{" "}
                  <span className="font-semibold">
                    {group.settings.currency} {overage.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Badge variant="destructive" className="text-sm font-bold px-3 py-1">
                {usage.percentage.toFixed(0)}%
              </Badge>
            </div>
          </div>
        );
      })}

      {/* Near Limit Warnings */}
      {nearLimitUsages.map((usage) => {
        const budget = activeBudgets.find((b) => b.id === usage.budgetId);
        if (!budget) return null;

        const remaining = budget.limit - usage.spent;

        return (
          <div
            key={budget.id}
            className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => onManageBudgets?.()}
          >
            <TrendingUp className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-yellow-800 font-semibold text-base mb-1">
                Approaching Limit: {budget.name}
              </h3>
              <div className="space-y-1">
                <p className="text-yellow-700 text-sm">
                  Spent:{" "}
                  <span className="font-semibold">
                    {group.settings.currency} {usage.spent.toFixed(2)}
                  </span>
                  of {group.settings.currency} {budget.limit.toFixed(2)} limit
                </p>
                <p className="text-yellow-700 text-sm">
                  Remaining:{" "}
                  <span className="font-semibold">
                    {group.settings.currency} {remaining.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-sm font-bold px-3 py-1">
                {usage.percentage.toFixed(0)}%
              </Badge>
            </div>
          </div>
        );
      })}

      {/* Quick Action to Manage Budgets */}
      {onManageBudgets &&
        (overBudgetUsages.length > 0 || nearLimitUsages.length > 0) && (
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-blue-700 font-medium">
                Need to adjust your budgets?
              </span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={onManageBudgets}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
            >
              Manage Budgets
            </Button>
          </div>
        )}
    </div>
  );
};

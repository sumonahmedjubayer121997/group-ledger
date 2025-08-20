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
    <div className="space-y-3">
      {/* Over Budget Alerts */}
      {overBudgetUsages.map((usage) => {
        const budget = activeBudgets.find((b) => b.id === usage.budgetId);
        if (!budget) return null;

        const overage = usage.spent - budget.limit;

        return (
          <Alert key={budget.id} className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">
              Budget Exceeded: {budget.name}
            </AlertTitle>
            <AlertDescription className="text-red-700">
              <div className="flex items-center justify-between mt-2">
                <div className="space-y-1">
                  <p className="text-sm">
                    Spent:{" "}
                    <span className="font-semibold">
                      {group.settings.currency} {usage.spent.toFixed(2)}
                    </span>
                    of {group.settings.currency} {budget.limit.toFixed(2)} limit
                  </p>
                  <p className="text-xs">
                    Over by:{" "}
                    <span className="font-semibold text-red-600">
                      {group.settings.currency} {overage.toFixed(2)}
                    </span>
                  </p>
                </div>
                <Badge variant="destructive" className="shrink-0">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {usage.percentage.toFixed(0)}%
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}

      {/* Near Limit Warnings */}
      {nearLimitUsages.map((usage) => {
        const budget = activeBudgets.find((b) => b.id === usage.budgetId);
        if (!budget) return null;

        const remaining = budget.limit - usage.spent;

        return (
          <Alert key={budget.id} className="border-yellow-200 bg-yellow-50">
            <TrendingUp className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">
              Approaching Limit: {budget.name}
            </AlertTitle>
            <AlertDescription className="text-yellow-700">
              <div className="flex items-center justify-between mt-2">
                <div className="space-y-1">
                  <p className="text-sm">
                    Spent:{" "}
                    <span className="font-semibold">
                      {group.settings.currency} {usage.spent.toFixed(2)}
                    </span>
                    of {group.settings.currency} {budget.limit.toFixed(2)} limit
                  </p>
                  <p className="text-xs">
                    Remaining:{" "}
                    <span className="font-semibold text-yellow-600">
                      {group.settings.currency} {remaining.toFixed(2)}
                    </span>
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-yellow-600 border-yellow-300 shrink-0"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {usage.percentage.toFixed(0)}%
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}

      {/* Quick Actions */}
      {onManageBudgets &&
        (overBudgetUsages.length > 0 || nearLimitUsages.length > 0) && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Need to adjust your budgets?
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onManageBudgets}
                  className="text-blue-600 border-blue-200 hover:bg-blue-100"
                >
                  Manage Budgets
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* All Budgets Summary */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            All Active Budgets ({activeBudgets.length})
          </h4>
          <div className="space-y-3">
            {activeBudgets.map((budget) => {
              const usage = budgetUsages.find((u) => u.budgetId === budget.id);
              const spent = usage?.spent || 0;
              const percentage = usage?.percentage || 0;
              const remaining = budget.limit - spent;
              const isOverBudget = usage?.isOverBudget || false;
              const isNearLimit = usage?.isNearLimit || false;

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
                      {isOverBudget && (
                        <Badge variant="destructive" className="text-xs">
                          Over Budget
                        </Badge>
                      )}
                      {isNearLimit && !isOverBudget && (
                        <Badge
                          variant="outline"
                          className="text-xs text-yellow-600 border-yellow-300"
                        >
                          Near Limit
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {group.settings.currency} {spent.toFixed(2)} of{" "}
                      {group.settings.currency} {budget.limit.toFixed(2)} •{" "}
                      {budget.period}
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOverBudget
                            ? "bg-red-500"
                            : isNearLimit
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div
                      className={`text-sm font-medium ${
                        isOverBudget
                          ? "text-red-600"
                          : isNearLimit
                          ? "text-yellow-600"
                          : "text-gray-900"
                      }`}
                    >
                      {percentage.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {isOverBudget
                        ? `${group.settings.currency} ${Math.abs(
                            remaining
                          ).toFixed(2)} over`
                        : `${group.settings.currency} ${remaining.toFixed(
                            2
                          )} left`}
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
};

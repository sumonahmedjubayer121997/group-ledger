import React from "react";
import { useBudgetStore } from "@/stores/budgetStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BudgetDebugPanelProps {
  groupId?: string;
}

export const BudgetDebugPanel: React.FC<BudgetDebugPanelProps> = ({
  groupId,
}) => {
  const { budgets, getAllGroupBudgets, getBudgetUsage } = useBudgetStore();
  const { expenses } = useExpenseStore();
  const { user } = useAuth();

  const allBudgets = budgets;
  const groupBudgets = groupId ? getAllGroupBudgets(groupId) : [];
  const groupExpenses = groupId
    ? expenses.filter((expense) => expense.groupId === groupId)
    : [];
  const budgetUsages = groupId
    ? getBudgetUsage(groupExpenses, undefined, groupId)
    : [];

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Budget Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium">All Budgets ({allBudgets.length})</h4>
          <div className="space-y-2 mt-2">
            {allBudgets.map((budget) => (
              <div key={budget.id} className="text-xs p-2 bg-gray-50 rounded">
                <div className="font-medium">{budget.name}</div>
                <div>Type: {budget.type}</div>
                <div>GroupId: {budget.groupId || "None"}</div>
                <div>Limit: {budget.limit}</div>
                <div>Active: {budget.isActive ? "Yes" : "No"}</div>
              </div>
            ))}
          </div>
        </div>

        {groupId && (
          <div>
            <h4 className="font-medium">
              Group Budgets ({groupBudgets.length})
            </h4>
            <div className="space-y-2 mt-2">
              {groupBudgets.map((budget) => (
                <div key={budget.id} className="text-xs p-2 bg-blue-50 rounded">
                  <div className="font-medium">{budget.name}</div>
                  <div>Type: {budget.type}</div>
                  <div>Category: {budget.category || "Overall"}</div>
                  <div>Limit: {budget.limit}</div>
                  <div>Active: {budget.isActive ? "Yes" : "No"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupId && (
          <div>
            <h4 className="font-medium">
              Budget Usages ({budgetUsages.length})
            </h4>
            <div className="space-y-2 mt-2">
              {budgetUsages.map((usage) => (
                <div
                  key={usage.budgetId}
                  className="text-xs p-2 bg-green-50 rounded"
                >
                  <div>Budget ID: {usage.budgetId}</div>
                  <div>Spent: {usage.spent}</div>
                  <div>Percentage: {usage.percentage.toFixed(1)}%</div>
                  <div className="flex space-x-2">
                    {usage.isOverBudget && (
                      <Badge variant="destructive">Over Budget</Badge>
                    )}
                    {usage.isNearLimit && !usage.isOverBudget && (
                      <Badge variant="outline">Near Limit</Badge>
                    )}
                    {!usage.isNearLimit && !usage.isOverBudget && (
                      <Badge variant="outline">On Track</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium">
            Group Expenses ({groupExpenses.length})
          </h4>
          <div className="text-xs">
            Total:{" "}
            {groupExpenses.reduce((sum, expense) => sum + expense.amount, 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

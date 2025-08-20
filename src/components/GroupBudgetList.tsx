import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useBudgetStore } from "@/stores/budgetStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3,
  Trash2,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { Group } from "@/stores/expenseStore";

interface GroupBudgetListProps {
  group: Group;
  onEditBudget?: (budget: any) => void;
}

export const GroupBudgetList: React.FC<GroupBudgetListProps> = ({
  group,
  onEditBudget,
}) => {
  const { getAllGroupBudgets, getBudgetUsage, deleteBudget } = useBudgetStore();
  const { expenses } = useExpenseStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const groupBudgets = getAllGroupBudgets(group.id);
  const activeBudgets = groupBudgets.filter((budget) => budget.isActive);
  const groupExpenses = expenses.filter(
    (expense) => expense.groupId === group.id
  );
  const budgetUsages = getBudgetUsage(groupExpenses, undefined, group.id);

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      setDeletingBudgetId(budgetId);
      await deleteBudget(budgetId, user?.uid || "", group.id);
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete budget error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete budget",
        variant: "destructive",
      });
    } finally {
      setDeletingBudgetId(null);
    }
  };

  const getBudgetStatus = (usage: any) => {
    if (usage.isOverBudget) {
      return {
        status: "over",
        color: "bg-red-500",
        textColor: "text-red-600",
        icon: AlertTriangle,
        label: "Over Budget",
      };
    } else if (usage.isNearLimit) {
      return {
        status: "warning",
        color: "bg-yellow-500",
        textColor: "text-yellow-600",
        icon: TrendingUp,
        label: "Near Limit",
      };
    } else {
      return {
        status: "good",
        color: "bg-green-500",
        textColor: "text-green-600",
        icon: CheckCircle,
        label: "On Track",
      };
    }
  };

  if (activeBudgets.length === 0) {
    return null; // This will be handled by GroupBudgetAlerts
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5" />
          <span>Active Budgets ({activeBudgets.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeBudgets.map((budget) => {
            const usage = budgetUsages.find((u) => u.budgetId === budget.id);
            const spent = usage?.spent || 0;
            const percentage = usage?.percentage || 0;
            const remaining = budget.limit - spent;
            const status = getBudgetStatus(usage || {});
            const StatusIcon = status.icon;

            return (
              <div 
                key={budget.id} 
                className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onEditBudget?.(budget)}
              >
                {/* Budget Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {budget.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {budget.category === "overall"
                            ? "Overall Budget"
                            : budget.category || "Overall"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {budget.period}
                        </Badge>
                        <Badge
                          variant={
                            status.status === "over" ? "destructive" : "outline"
                          }
                          className={`text-xs ${status.textColor}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    {onEditBudget && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditBudget(budget);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the budget "
                            {budget.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBudget(budget.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Spent:{" "}
                      <span className="font-medium">
                        {group.settings.currency} {spent.toFixed(2)}
                      </span>
                    </span>
                    <span className="text-gray-600">
                      Limit:{" "}
                      <span className="font-medium">
                        {group.settings.currency} {budget.limit.toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={Math.min(percentage, 100)}
                    className={`h-3 ${
                      status.status === "over"
                        ? "[&>div]:bg-red-500"
                        : status.status === "warning"
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-green-500"
                    }`}
                  />
                  <div className="flex justify-between text-xs">
                    <span className={`font-medium ${status.textColor}`}>
                      {percentage.toFixed(1)}% used
                    </span>
                    <span className="text-gray-500">
                      {remaining >= 0 ? (
                        <span>
                          {group.settings.currency} {remaining.toFixed(2)}{" "}
                          remaining
                        </span>
                      ) : (
                        <span className="text-red-600">
                          {group.settings.currency}{" "}
                          {Math.abs(remaining).toFixed(2)} over limit
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Alert Threshold Info */}
                <div className="text-xs text-gray-500 pt-2 border-t">
                  Alert at {budget.alertThreshold}% of limit (
                  {group.settings.currency}{" "}
                  {((budget.limit * budget.alertThreshold) / 100).toFixed(2)})
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

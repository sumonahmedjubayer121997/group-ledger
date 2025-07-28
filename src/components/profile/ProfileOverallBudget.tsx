import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBudgetStore, Budget } from '@/stores/budgetStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit3, Plus, Target, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';

export const ProfileOverallBudget: React.FC = () => {
  const [newBudget, setNewBudget] = useState({
    name: '',
    category: '',
    limit: 0,
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    alertThreshold: 80,
  });
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const { 
    addBudget, 
    updateBudget, 
    deleteBudget, 
    getIndividualBudgets, 
    getBudgetUsage 
  } = useBudgetStore();
  
  const { categories } = useCategoryStore();
  const { expenses } = useExpenseStore();
  const { toast } = useToast();

  const userBudgets = getIndividualBudgets();
  const userExpenses = expenses.filter(expense => !expense.groupId); // Personal expenses only
  const budgetUsages = getBudgetUsage(userExpenses);

  const handleAddBudget = () => {
    if (!newBudget.name || newBudget.limit <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addBudget({
      ...newBudget,
      type: 'individual',
      isActive: true,
    });

    toast({
      title: "Success",
      description: "Overall budget created successfully",
    });

    setNewBudget({
      name: '',
      category: '',
      limit: 0,
      period: 'monthly',
      alertThreshold: 80,
    });
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setNewBudget({
      name: budget.name,
      category: budget.category || '',
      limit: budget.limit,
      period: budget.period,
      alertThreshold: budget.alertThreshold,
    });
  };

  const handleUpdateBudget = () => {
    if (!editingBudget) return;

    updateBudget(editingBudget.id, {
      ...newBudget,
    });

    toast({
      title: "Success",
      description: "Budget updated successfully",
    });

    setEditingBudget(null);
    setNewBudget({
      name: '',
      category: '',
      limit: 0,
      period: 'monthly',
      alertThreshold: 80,
    });
  };

  const handleDeleteBudget = (budgetId: string) => {
    deleteBudget(budgetId);
    toast({
      title: "Success",
      description: "Budget deleted successfully",
    });
  };

  const getBudgetStatus = (usage: any) => {
    if (usage.isOverBudget) {
      return { status: 'over', color: 'text-red-600', icon: AlertTriangle };
    } else if (usage.isNearLimit) {
      return { status: 'warning', color: 'text-yellow-600', icon: AlertTriangle };
    } else {
      return { status: 'good', color: 'text-green-600', icon: CheckCircle };
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Budget Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>{editingBudget ? 'Edit Overall Budget' : 'Create Overall Budget'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget-name">Budget Name</Label>
              <Input
                id="budget-name"
                placeholder="e.g., Monthly Personal Budget"
                value={newBudget.name}
                onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="budget-category">Category</Label>
              <Select 
                value={newBudget.category} 
                onValueChange={(value) => setNewBudget({ ...newBudget, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall Personal Budget</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="budget-limit">Budget Limit ($)</Label>
              <Input
                id="budget-limit"
                type="number"
                placeholder="0.00"
                value={newBudget.limit || ''}
                onChange={(e) => setNewBudget({ ...newBudget, limit: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="budget-period">Period</Label>
              <Select 
                value={newBudget.period} 
                onValueChange={(value: 'weekly' | 'monthly' | 'yearly') => 
                  setNewBudget({ ...newBudget, period: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alert-threshold">Alert Threshold (%)</Label>
              <Input
                id="alert-threshold"
                type="number"
                min="1"
                max="100"
                value={newBudget.alertThreshold}
                onChange={(e) => setNewBudget({ ...newBudget, alertThreshold: parseInt(e.target.value) || 80 })}
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={editingBudget ? handleUpdateBudget : handleAddBudget}>
              {editingBudget ? 'Update Budget' : 'Create Budget'}
            </Button>
            {editingBudget && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingBudget(null);
                  setNewBudget({
                    name: '',
                    category: '',
                    limit: 0,
                    period: 'monthly',
                    alertThreshold: 80,
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Budgets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Overall Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {userBudgets.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No personal budgets created yet</p>
              <p className="text-sm text-gray-400">Create your first budget to start tracking spending</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userBudgets.map((budget) => {
                const usage = budgetUsages.find(u => u.budgetId === budget.id);
                const status = usage ? getBudgetStatus(usage) : null;
                const StatusIcon = status?.icon || CheckCircle;

                return (
                  <Card key={budget.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={`w-5 h-5 ${status?.color}`} />
                          <div>
                            <h3 className="font-semibold">{budget.name}</h3>
                            <p className="text-sm text-gray-600">
                              {budget.category === 'overall' ? 'Overall Budget' : budget.category || 'Overall'} • {budget.period}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={budget.isActive}
                            onCheckedChange={(checked) => updateBudget(budget.id, { isActive: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditBudget(budget)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this budget? This action cannot be undone.
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

                      {usage && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Spent: $ {usage.spent.toFixed(2)}</span>
                            <span>Limit: $ {budget.limit.toFixed(2)}</span>
                          </div>
                          <Progress 
                            value={Math.min(usage.percentage, 100)} 
                            className="h-2"
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {usage.percentage.toFixed(1)}% used
                            </span>
                            {usage.isOverBudget && (
                              <Badge variant="destructive" className="text-xs">
                                Over Budget
                              </Badge>
                            )}
                            {usage.isNearLimit && !usage.isOverBudget && (
                              <Badge variant="outline" className="text-yellow-600 text-xs">
                                Near Limit
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

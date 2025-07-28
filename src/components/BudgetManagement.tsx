import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { AlertTriangle, Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { useBudgetStore, Budget } from '../stores/budgetStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useExpenseStore } from '../stores/expenseStore';

interface BudgetManagementProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const BudgetManagement: React.FC<BudgetManagementProps> = ({ isOpen, onClose }) => {
  const { budgets, addBudget, updateBudget, deleteBudget, getBudgetUsage } = useBudgetStore();
  const { categories } = useCategoryStore();
  const { expenses } = useExpenseStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    limit: '',
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    alertThreshold: '80',
    isActive: true,
  });

  const budgetUsage = getBudgetUsage(expenses);

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      limit: '',
      period: 'monthly',
      alertThreshold: '80',
      isActive: true,
    });
    setEditingBudget(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.limit) return;

    const budgetData = {
      name: formData.name,
      category: formData.category || undefined,
      limit: parseFloat(formData.limit),
      period: formData.period,
      alertThreshold: parseFloat(formData.alertThreshold),
      isActive: formData.isActive,
    };

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData);
    } else {
      addBudget(budgetData);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      category: budget.category || '',
      limit: budget.limit.toString(),
      period: budget.period,
      alertThreshold: budget.alertThreshold.toString(),
      isActive: budget.isActive,
    });
    setIsDialogOpen(true);
  };

  const getBudgetStatus = (budgetId: string) => {
    return budgetUsage.find(usage => usage.budgetId === budgetId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Budget Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? 'Edit Budget' : 'Create New Budget'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Budget Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monthly Food Budget"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (leave empty for overall budget)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Overall Budget</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="limit">Spending Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  step="0.01"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="period">Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value: any) => setFormData({ ...formData, period: value })}
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
                <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                  placeholder="80"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No budgets created yet. Create your first budget to start tracking spending limits.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {budgets.map((budget) => {
            const usage = getBudgetStatus(budget.id);
            return (
              <Card key={budget.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{budget.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {budget.category ? `Category: ${budget.category}` : 'Overall Budget'} • 
                        {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!budget.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {usage?.isOverBudget && (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Over Budget
                        </Badge>
                      )}
                      {usage?.isNearLimit && !usage?.isOverBudget && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Near Limit
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Budget Limit</span>
                      <span className="font-medium">${budget.limit.toFixed(2)}</span>
                    </div>
                    
                    {usage && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Spent</span>
                          <span className={`font-medium ${usage.isOverBudget ? 'text-red-600' : ''}`}>
                            ${usage.spent.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{usage.percentage.toFixed(0)}%</span>
                          </div>
                          <Progress 
                            value={Math.min(usage.percentage, 100)} 
                            className={`h-2 ${usage.isOverBudget ? '[&>div]:bg-red-500' : usage.isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
                          />
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span>Remaining</span>
                          <span className={`font-medium ${usage.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                            ${Math.max(0, budget.limit - usage.spent).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(budget)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteBudget(budget.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
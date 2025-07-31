import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Plus, Edit, Trash2, Target, Users, User, DollarSign } from 'lucide-react';
import { useBudgetStore, Budget, BudgetType } from '@/stores/budgetStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ComprehensiveBudgetManagementProps {
  groupId?: string;
  groupName?: string;
}

export const ComprehensiveBudgetManagement: React.FC<ComprehensiveBudgetManagementProps> = ({ 
  groupId, 
  groupName 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { categories } = useCategoryStore();
  const { expenses } = useExpenseStore();
  const { 
    addBudget, 
    updateBudget, 
    deleteBudget, 
    getBudgetUsage,
    getIndividualBudgets,
    getGroupCategoryBudgets,
    getGroupOverallBudgets,
    getUserGroupBudgets 
  } = useBudgetStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'individual' as BudgetType,
    category: '',
    limit: '',
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    alertThreshold: '80',
    userId: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'individual',
      category: '',
      limit: '',
      period: 'monthly',
      alertThreshold: '80',
      userId: '',
    });
    setEditingBudget(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.limit) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const budgetData = {
      name: formData.name,
      type: formData.type,
      category: formData.category || undefined,
      groupId: ['group_category', 'group_overall', 'user_group'].includes(formData.type) ? groupId : undefined,
      userId: formData.type === 'user_group' ? formData.userId : 
              formData.type === 'individual' ? user?.uid : undefined,
      limit: parseFloat(formData.limit),
      period: formData.period,
      alertThreshold: parseFloat(formData.alertThreshold),
      isActive: true,
    };

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData, user?.uid || '');
      toast({
        title: "Success",
        description: "Budget updated successfully",
      });
    } else {
      addBudget(budgetData, user?.uid || '');
      toast({
        title: "Success",
        description: "Budget created successfully",
      });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      type: budget.type,
      category: budget.category || '',
      limit: budget.limit.toString(),
      period: budget.period,
      alertThreshold: budget.alertThreshold.toString(),
      userId: budget.userId || '',
    });
    setActiveTab(budget.type === 'individual' ? 'personal' : 
               budget.type === 'group_category' ? 'group_category' :
               budget.type === 'group_overall' ? 'group_overall' : 'user_group');
    setIsDialogOpen(true);
  };

  const getBudgetsByType = (type: BudgetType) => {
    switch (type) {
      case 'individual':
        return getIndividualBudgets(user?.uid);
      case 'group_category':
        return groupId ? getGroupCategoryBudgets(groupId) : [];
      case 'group_overall':
        return groupId ? getGroupOverallBudgets(groupId) : [];
      case 'user_group':
        return groupId ? getUserGroupBudgets(groupId) : [];
      default:
        return [];
    }
  };

  const getBudgetUsageForType = (type: BudgetType) => {
    return getBudgetUsage(expenses, user?.uid, groupId);
  };

  const getBudgetStatus = (budgetId: string, type: BudgetType) => {
    const usage = getBudgetUsageForType(type).find(u => u.budgetId === budgetId);
    return usage;
  };

  const renderBudgetCard = (budget: Budget, type: BudgetType) => {
    const usage = getBudgetStatus(budget.id, type);
    
    return (
      <Card key={budget.id} className="relative">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{budget.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {budget.type === 'individual' && 'Personal Budget'}
                {budget.type === 'group_category' && `Category: ${budget.category}`}
                {budget.type === 'group_overall' && 'Overall Group Budget'}
                {budget.type === 'user_group' && 'Personal Group Budget'}
                {' • '}
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
                onClick={() => deleteBudget(budget.id, user?.uid || '')}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const budgetTypeConfig = {
    individual: {
      icon: User,
      title: 'Individual Budgets',
      description: 'Personal spending limits across all your expenses'
    },
    group_category: {
      icon: Target,
      title: 'Group Category Budgets',
      description: 'Category-specific spending limits within the group'
    },
    group_overall: {
      icon: Users,
      title: 'Overall Group Budget',
      description: 'Total spending limit for the entire group'
    },
    user_group: {
      icon: DollarSign,
      title: 'Personal Group Budgets',
      description: 'Individual spending limits within group activities'
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          {groupName && <p className="text-muted-foreground">Managing budgets for {groupName}</p>}
        </div>
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
                <Label htmlFor="type">Budget Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: BudgetType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Budget</SelectItem>
                    {groupId && (
                      <>
                        <SelectItem value="group_category">Group Category Budget</SelectItem>
                        <SelectItem value="group_overall">Overall Group Budget</SelectItem>
                        <SelectItem value="user_group">Personal Group Budget</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

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

              {formData.type === 'group_category' && (
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === 'user_group' && (
                <div>
                  <Label htmlFor="userId">User ID (leave empty for yourself)</Label>
                  <Input
                    id="userId"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="User ID or leave empty for yourself"
                  />
                </div>
              )}

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="personal">Personal Budget</TabsTrigger>
          <TabsTrigger value="enforcement">Budget Enforcement</TabsTrigger>
          {groupId && (
            <>
              <TabsTrigger value="group_category">Group Categories</TabsTrigger>
              <TabsTrigger value="group_overall">Group Overall</TabsTrigger>
              <TabsTrigger value="user_group">User in Group</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Personal Budget Tab */}
        <TabsContent value="personal" className="space-y-4">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <div>
              <h3 className="text-lg font-semibold">Personal Budget Tracking</h3>
              <p className="text-sm text-muted-foreground">Define and track your personal spending limits - separate from group expenses</p>
            </div>
          </div>

          {(() => {
            const budgets = getBudgetsByType('individual');
            return budgets.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No personal budgets created yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {budgets.map((budget) => renderBudgetCard(budget, 'individual'))}
              </div>
            );
          })()}
        </TabsContent>

        {/* Budget Enforcement Tab */}
        <TabsContent value="enforcement" className="space-y-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h3 className="text-lg font-semibold">Budget Enforcement</h3>
              <p className="text-sm text-muted-foreground">Monitor and enforce budget limits across all budget types</p>
            </div>
          </div>

          <div className="grid gap-4">
            {/* Personal Budget Enforcement */}
            {(() => {
              const personalBudgets = getBudgetsByType('individual');
              const personalUsages = getBudgetUsage(expenses, user?.uid);
              const violatedPersonal = personalUsages.filter(usage => 
                personalBudgets.find(b => b.id === usage.budgetId && b.isActive) && usage.isOverBudget
              );

              return personalBudgets.length > 0 && (
                <Card className={violatedPersonal.length > 0 ? "border-red-200" : "border-green-200"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Personal Budget Status
                      {violatedPersonal.length > 0 && (
                        <Badge variant="destructive">{violatedPersonal.length} Over Budget</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {violatedPersonal.length === 0 ? (
                      <p className="text-green-600">All personal budgets are within limits</p>
                    ) : (
                      <div className="space-y-2">
                        {violatedPersonal.map(usage => {
                          const budget = personalBudgets.find(b => b.id === usage.budgetId);
                          return budget && (
                            <div key={budget.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                              <span className="font-medium">{budget.name}</span>
                              <span className="text-red-600">Over by ${(usage.spent - budget.limit).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Group Budget Enforcement */}
            {groupId && (() => {
              const groupBudgets = [
                ...getBudgetsByType('group_category'),
                ...getBudgetsByType('group_overall'),
                ...getBudgetsByType('user_group')
              ];
              const groupUsages = getBudgetUsage(expenses, user?.uid, groupId);
              const violatedGroup = groupUsages.filter(usage => 
                groupBudgets.find(b => b.id === usage.budgetId && b.isActive) && usage.isOverBudget
              );

              return groupBudgets.length > 0 && (
                <Card className={violatedGroup.length > 0 ? "border-red-200" : "border-green-200"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Group Budget Status
                      {violatedGroup.length > 0 && (
                        <Badge variant="destructive">{violatedGroup.length} Over Budget</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {violatedGroup.length === 0 ? (
                      <p className="text-green-600">All group budgets are within limits</p>
                    ) : (
                      <div className="space-y-2">
                        {violatedGroup.map(usage => {
                          const budget = groupBudgets.find(b => b.id === usage.budgetId);
                          return budget && (
                            <div key={budget.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                              <span className="font-medium">{budget.name}</span>
                              <span className="text-red-600">Over by ${(usage.spent - budget.limit).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </TabsContent>

        {/* Group Category Budgets Tab */}
        {groupId && (
          <TabsContent value="group_category" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <div>
                <h3 className="text-lg font-semibold">Group Category Budgets</h3>
                <p className="text-sm text-muted-foreground">Category-specific spending limits within the group</p>
              </div>
            </div>

            {(() => {
              const budgets = getBudgetsByType('group_category');
              return budgets.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No group category budgets created yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {budgets.map((budget) => renderBudgetCard(budget, 'group_category'))}
                </div>
              );
            })()}
          </TabsContent>
        )}

        {/* Group Overall Budget Tab */}
        {groupId && (
          <TabsContent value="group_overall" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <div>
                <h3 className="text-lg font-semibold">Overall Group Budget</h3>
                <p className="text-sm text-muted-foreground">Total spending limit for the entire group</p>
              </div>
            </div>

            {(() => {
              const budgets = getBudgetsByType('group_overall');
              return budgets.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No overall group budget created yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {budgets.map((budget) => renderBudgetCard(budget, 'group_overall'))}
                </div>
              );
            })()}
          </TabsContent>
        )}

        {/* User Group Budget Tab */}
        {groupId && (
          <TabsContent value="user_group" className="space-y-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <div>
                <h3 className="text-lg font-semibold">User Budget Within Group</h3>
                <p className="text-sm text-muted-foreground">Individual spending limits within group activities</p>
              </div>
            </div>

            {(() => {
              const budgets = getBudgetsByType('user_group');
              return budgets.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No user group budgets created yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {budgets.map((budget) => renderBudgetCard(budget, 'user_group'))}
                </div>
              );
            })()}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
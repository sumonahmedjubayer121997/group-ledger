
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Expense, useExpenseStore } from '@/stores/expenseStore';
import { Receipt, Calendar, User, Tag, MoreVertical, Pencil, Trash2, Plus } from 'lucide-react';
import { ExpenseForm } from './ExpenseForm';
import { EditExpenseForm } from './EditExpenseForm';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface RecentExpensesProps {
  expenses: Expense[];
}

export const RecentExpenses: React.FC<RecentExpensesProps> = ({ expenses }) => {
  const { deleteExpense } = useExpenseStore();
  const { toast } = useToast();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const recentExpenses = expenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleDeleteExpense = async (expense: Expense) => {
    try {
      await deleteExpense(expense.id, expense.groupId);
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  if (recentExpenses.length === 0) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-2xl">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <span>Recent Expenses</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-0 pb-4 sm:px-6 sm:pb-6">
          <div className="text-center py-6 sm:py-8">
            <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-600 mb-2 text-sm sm:text-base">No expenses yet</p>
            <p className="text-xs sm:text-sm text-gray-500">Add your first expense to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <span className="text-lg sm:text-2xl">Recent Expenses</span>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowExpenseForm(true)}
              size="sm" 
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 hidden sm:flex">
              View All
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-0 pb-4 sm:px-6 sm:pb-6">
        <div className="space-y-3 sm:space-y-4">
          {recentExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{expense.description}</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-500 space-y-1 sm:space-y-0">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">Paid by {expense.paidBy.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{formatDistanceToNow(new Date(expense.date), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">${expense.amount.toFixed(2)}</div>
                  <Badge variant="outline" className="text-xs">
                    {expense.category}
                  </Badge>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this expense? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteExpense(expense)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 sm:hidden">
          <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
            View All
          </Button>
        </div>
      </CardContent>

      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
      />

      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </Card>
  );
};

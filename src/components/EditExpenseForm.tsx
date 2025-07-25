import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { useExpenseStore, Expense, Member } from '@/stores/expenseStore';
import { Pencil, Users, Tag, Calculator, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditExpenseFormProps {
  expense: Expense;
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills & Utilities',
  'Travel',
  'Other',
];

export const EditExpenseForm: React.FC<EditExpenseFormProps> = ({ expense, isOpen, onClose }) => {
  const { updateExpense, groups, loading } = useExpenseStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    description: expense.description,
    amount: expense.amount.toString(),
    paidBy: expense.paidBy.id,
    category: expense.category,
    date: new Date(expense.date).toISOString().split('T')[0],
    splitType: expense.splitType || 'equal' as 'equal' | 'exact' | 'percentage',
  });
  
  const [splitData, setSplitData] = useState<{ [memberId: string]: number }>(expense.splitData || {});

  const selectedGroup = groups.find(g => g.id === expense.groupId);
  const selectedPayer = selectedGroup?.members.find(m => m.id === formData.paidBy);
  const splitAmong = expense.splitAmong || selectedGroup?.members || [];

  useEffect(() => {
    // Initialize form with expense data
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      paidBy: expense.paidBy.id,
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      splitType: expense.splitType || 'equal',
    });
    setSplitData(expense.splitData || {});
  }, [expense]);

  const updateSplitAmount = (memberId: string, value: number) => {
    setSplitData(prev => ({ ...prev, [memberId]: value }));
  };

  const getTotalSplit = () => {
    return Object.values(splitData).reduce((sum, val) => sum + val, 0);
  };

  const getRemainingAmount = () => {
    const total = parseFloat(formData.amount) || 0;
    if (formData.splitType === 'percentage') {
      return 100 - getTotalSplit();
    }
    return total - getTotalSplit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGroup || !selectedPayer) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updateExpense(expense.id, {
        description: formData.description,
        amount: parseFloat(formData.amount),
        paidBy: selectedPayer,
        category: formData.category,
        date: new Date(formData.date),
        splitType: formData.splitType,
        splitData: formData.splitType !== 'equal' ? splitData : undefined,
      });
      
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-1 sm:px-0">
          <DialogTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <Pencil className="w-5 h-5 text-blue-500" />
            <span>Edit Expense</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 px-1 sm:px-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What was this expense for?"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="amount" className="text-sm font-medium">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paidBy" className="text-sm font-medium">Paid by</Label>
              <Select value={formData.paidBy} onValueChange={(value) => setFormData({ ...formData, paidBy: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGroup?.members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4" />
                        <span>{category}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="date" className="text-sm font-medium">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="mt-1"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium">How should this be split?</Label>
            <RadioGroup 
              value={formData.splitType} 
              onValueChange={(value: 'equal' | 'exact' | 'percentage') => 
                setFormData({ ...formData, splitType: value })
              }
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equal" id="equal" />
                <Label htmlFor="equal" className="flex items-center space-x-2 cursor-pointer">
                  <Users className="w-4 h-4" />
                  <span>Equal Split</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exact" id="exact" />
                <Label htmlFor="exact" className="flex items-center space-x-2 cursor-pointer">
                  <Calculator className="w-4 h-4" />
                  <span>Exact Amounts</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="flex items-center space-x-2 cursor-pointer">
                  <Percent className="w-4 h-4" />
                  <span>Percentages</span>
                </Label>
              </div>
            </RadioGroup>

            {formData.splitType !== 'equal' && splitAmong.length > 0 && formData.amount && (
              <div className="space-y-4 border rounded-lg p-3 sm:p-4 bg-secondary/20">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                  <h4 className="font-medium text-sm sm:text-base">Split Details</h4>
                  {formData.splitType === 'percentage' && (
                    <span className={`text-sm ${getRemainingAmount() === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      Remaining: {getRemainingAmount()}%
                    </span>
                  )}
                  {formData.splitType === 'exact' && (
                    <span className={`text-sm ${Math.abs(getRemainingAmount()) < 0.01 ? 'text-green-600' : 'text-orange-600'}`}>
                      Remaining: ${getRemainingAmount().toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {splitAmong.map((member) => (
                    <div key={member.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">{member.name}</Label>
                        <span className="text-sm text-muted-foreground">
                          {formData.splitType === 'percentage' 
                            ? `${splitData[member.id] || 0}%` 
                            : `$${(splitData[member.id] || 0).toFixed(2)}`
                          }
                        </span>
                      </div>
                      
                      {formData.splitType === 'percentage' ? (
                        <Slider
                          value={[splitData[member.id] || 0]}
                          onValueChange={([value]) => updateSplitAmount(member.id, value)}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <Slider
                            value={[splitData[member.id] || 0]}
                            onValueChange={([value]) => updateSplitAmount(member.id, value)}
                            max={parseFloat(formData.amount) || 100}
                            step={0.01}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={splitData[member.id] || 0}
                            onChange={(e) => updateSplitAmount(member.id, parseFloat(e.target.value) || 0)}
                            className="w-full sm:w-20 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {loading ? 'Updating...' : 'Update Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
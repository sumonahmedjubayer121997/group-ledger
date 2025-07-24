
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useExpenseStore, Group, Member } from '@/stores/expenseStore';
import { RotateCcw, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecurringExpenseDialogProps {
  group: Group;
  children: React.ReactNode;
}

const categories = [
  { value: 'food', label: 'Food' },
  { value: 'travel', label: 'Travel' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'rent', label: 'Rent' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'other', label: 'Other' }
];

const frequencies = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

export const RecurringExpenseDialog: React.FC<RecurringExpenseDialogProps> = ({ group, children }) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('utilities');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [paidById, setPaidById] = useState('');
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [nextDue, setNextDue] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const { addRecurringExpense } = useExpenseStore();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!description.trim() || !amount || !paidById || splitAmong.length === 0 || !nextDue) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const paidBy = group.members.find(m => m.id === paidById);
    const splitMembers = group.members.filter(m => splitAmong.includes(m.id));

    if (!paidBy) {
      toast({
        title: "Invalid Selection",
        description: "Please select who is paying.",
        variant: "destructive"
      });
      return;
    }

    addRecurringExpense({
      description: description.trim(),
      amount: parseFloat(amount),
      paidBy,
      splitAmong: splitMembers,
      category,
      frequency,
      nextDue: new Date(nextDue),
      isActive,
      groupId: group.id,
    });

    toast({
      title: "Recurring Expense Added",
      description: `${description} will be created ${frequency} starting ${new Date(nextDue).toLocaleDateString()}`,
    });

    // Reset form
    setDescription('');
    setAmount('');
    setCategory('utilities');
    setFrequency('monthly');
    setPaidById('');
    setSplitAmong([]);
    setNextDue('');
    setIsActive(true);
    setOpen(false);
  };

  const handleSplitChange = (memberId: string, checked: boolean) => {
    if (checked) {
      setSplitAmong([...splitAmong, memberId]);
    } else {
      setSplitAmong(splitAmong.filter(id => id !== memberId));
    }
  };

  const selectAllMembers = () => {
    setSplitAmong(group.members.map(m => m.id));
  };

  const clearAllMembers = () => {
    setSplitAmong([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RotateCcw className="w-5 h-5" />
            <span>Add Recurring Expense</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Monthly rent, Netflix subscription"
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frequency and Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select value={frequency} onValueChange={(value: 'weekly' | 'monthly' | 'yearly') => setFrequency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="next-due">First Due Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="next-due"
                  type="date"
                  value={nextDue}
                  onChange={(e) => setNextDue(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Who Paid */}
          <div>
            <Label htmlFor="paid-by">Who will pay? *</Label>
            <Select value={paidById} onValueChange={setPaidById}>
              <SelectTrigger>
                <SelectValue placeholder="Select who will pay" />
              </SelectTrigger>
              <SelectContent>
                {group.members.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split Among */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Split among *</Label>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllMembers}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAllMembers}
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {group.members.map(member => (
                <div key={member.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`split-${member.id}`}
                    checked={splitAmong.includes(member.id)}
                    onChange={(e) => handleSplitChange(member.id, e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor={`split-${member.id}`} className="cursor-pointer">
                    {member.name}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Selected: {splitAmong.length} member{splitAmong.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is-active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable automatic creation of this expense
              </p>
            </div>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Preview */}
          {description && amount && frequency && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Preview</div>
              <div className="font-medium">
                ${parseFloat(amount || '0').toFixed(2)} for "{description}"
              </div>
              <div className="text-sm text-muted-foreground">
                Will be created {frequency} starting {nextDue ? new Date(nextDue).toLocaleDateString() : 'TBD'}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Create Recurring Expense
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useExpenseStore } from '@/stores/expenseStore';
import { Member } from '@/stores/expenseStore';
import { v4 as uuidv4 } from 'uuid';

interface SettlementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fromMember: Member;
  toMember: Member;
  amount: number;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'other', label: 'Other' }
].filter(method => method.value && typeof method.value === 'string' && method.value.trim() !== '');

export const SettlementDialog: React.FC<SettlementDialogProps> = ({
  isOpen,
  onClose,
  fromMember,
  toMember,
  amount
}) => {
  const { addSettlement } = useExpenseStore();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const settlement = {
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      amount,
      paymentMethod,
      notes,
      referenceId: uuidv4(),
      date: new Date()
    };

    addSettlement(settlement);
    onClose();
    setPaymentMethod('cash');
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record Settlement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p><strong>{fromMember.name}</strong> pays <strong>{toMember.name}</strong></p>
            <p className="text-lg font-semibold">${amount.toFixed(2)}</p>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Record Settlement</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};


import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Balance, useExpenseStore } from '@/stores/expenseStore';
import { CreditCard, DollarSign, Smartphone, Banknote, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettlementDialogProps {
  balance: Balance;
  children: React.ReactNode;
}

const validPaymentMethods = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
  { id: 'paypal', label: 'PayPal', icon: DollarSign },
  { id: 'venmo', label: 'Venmo/UPI', icon: Smartphone },
].filter(method => method.id && method.id.trim() !== '' && method.label && method.label.trim() !== '');

export const SettlementDialog: React.FC<SettlementDialogProps> = ({ balance, children }) => {
  const [open, setOpen] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState([balance.amount]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  
  const { addSettlement } = useExpenseStore();
  const { toast } = useToast();

  const handleSettlement = () => {
    const amount = isPartialPayment ? settlementAmount[0] : balance.amount;
    
    addSettlement({
      fromMemberId: balance.from.id,
      toMemberId: balance.to.id,
      amount,
      paymentMethod,
      notes,
      referenceId,
      date: new Date(),
      status: 'completed'
    });

    toast({
      title: "Settlement Recorded",
      description: `${balance.from.name} paid $${amount.toFixed(2)} to ${balance.to.name}`,
    });

    setOpen(false);
    // Reset form
    setSettlementAmount([balance.amount]);
    setPaymentMethod('cash');
    setNotes('');
    setReferenceId('');
    setIsPartialPayment(false);
  };

  const maxAmount = balance.amount;
  const currentAmount = settlementAmount[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Receipt className="w-5 h-5" />
            <span>Record Settlement</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Settlement Overview */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Settlement</div>
            <div className="font-medium">
              {balance.from.name} → {balance.to.name}
            </div>
            <div className="text-lg font-semibold text-red-600">
              Total Owed: ${balance.amount.toFixed(2)}
            </div>
          </div>

          {/* Partial Payment Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="partial"
              checked={isPartialPayment}
              onChange={(e) => setIsPartialPayment(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="partial">Partial payment</Label>
          </div>

          {/* Amount Slider */}
          {isPartialPayment && (
            <div className="space-y-3">
              <Label>Payment Amount</Label>
              <div className="px-2">
                <Slider
                  value={settlementAmount}
                  onValueChange={setSettlementAmount}
                  max={maxAmount}
                  min={0.01}
                  step={0.01}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>$0.01</span>
                <span className="font-medium text-foreground">
                  ${currentAmount.toFixed(2)}
                </span>
                <span>${maxAmount.toFixed(2)}</span>
              </div>
              {currentAmount < maxAmount && (
                <div className="text-sm text-muted-foreground">
                  Remaining: ${(maxAmount - currentAmount).toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="grid grid-cols-2 gap-3">
                {validPaymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label 
                        htmlFor={method.id} 
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{method.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Reference ID */}
          {paymentMethod !== 'cash' && (
            <div className="space-y-2">
              <Label htmlFor="reference">Reference ID (optional)</Label>
              <Input
                id="reference"
                placeholder="Transaction ID, receipt number..."
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Payment details, context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

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
              onClick={handleSettlement}
              className="flex-1"
            >
              Record Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

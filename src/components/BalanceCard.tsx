
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Balance } from '@/stores/expenseStore';
import { ArrowRight, DollarSign } from 'lucide-react';
import { SettlementDialog } from './SettlementDialog';

interface BalanceCardProps {
  balances: Balance[];
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balances }) => {
  if (balances.length === 0) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span>Balances</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-gray-600">All settled up!</p>
            <p className="text-sm text-gray-500">No pending balances</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          <span>Balances</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {balances.map((balance, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {balance.from.name.charAt(0)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">{balance.from.name}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{balance.to.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-red-600">
                  ${balance.amount.toFixed(2)}
                </div>
                <SettlementDialog balance={balance}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 text-xs border-green-200 text-green-600 hover:bg-green-50"
                  >
                    Settle up
                  </Button>
                </SettlementDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExpenseStore } from '@/stores/expenseStore';
import { History, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export const SettlementHistory: React.FC = () => {
  const { settlements, groups, simplifyDebts } = useExpenseStore();
  const allMembers = groups.flatMap(group => group.members);

  const getSettlementHistory = () => {
    return settlements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const exportHistory = () => {
    const history = getSettlementHistory();
    const csvContent = [
      ['Date', 'From', 'To', 'Amount', 'Method', 'Reference', 'Notes'],
      ...history.map(settlement => {
        const fromMember = allMembers.find(m => m.id === settlement.fromMemberId);
        const toMember = allMembers.find(m => m.id === settlement.toMemberId);
        return [
          format(new Date(settlement.date), 'yyyy-MM-dd'),
          fromMember?.name || 'Unknown',
          toMember?.name || 'Unknown',
          settlement.amount.toFixed(2),
          settlement.paymentMethod,
          settlement.referenceId || '',
          settlement.notes || ''
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settlement-history.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const settlementHistory = getSettlementHistory();

  if (settlementHistory.length === 0) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-blue-500" />
              <span>Settlement History</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-gray-600">No settlements yet</p>
            <p className="text-sm text-gray-500">Payment history will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-500" />
            <span>Settlement History</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={simplifyDebts}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Simplify Debts
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportHistory}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Export CSV
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {settlementHistory.map((settlement) => {
            const fromMember = allMembers.find(m => m.id === settlement.fromMemberId);
            const toMember = allMembers.find(m => m.id === settlement.toMemberId);
            
            return (
              <div key={settlement.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-green-400">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-medium text-xs">
                        {fromMember?.name.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{fromMember?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-500">paid</span>
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-xs">
                        {toMember?.name.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{toMember?.name || 'Unknown'}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      ${settlement.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(settlement.date), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-3">
                    <span className="bg-white px-2 py-1 rounded capitalize">
                      {settlement.paymentMethod.replace('_', ' ')}
                    </span>
                    {settlement.referenceId && (
                      <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                        {settlement.referenceId}
                      </span>
                    )}
                  </div>
                  <span className="text-green-600 font-medium">
                    {settlement.status}
                  </span>
                </div>
                
                {settlement.notes && (
                  <div className="mt-2 text-xs text-gray-600 italic">
                    "{settlement.notes}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settlement } from '@/stores/expenseStore';
import { getGroupSettlements } from '@/services/firebaseService';
import { Handshake, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface SettlementSummaryProps {
  groupId: string;
}

export const SettlementSummary: React.FC<SettlementSummaryProps> = ({ groupId }) => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettlements = async () => {
      try {
        setLoading(true);
        const groupSettlements = await getGroupSettlements(groupId);
        setSettlements(groupSettlements);
      } catch (error) {
        console.error('Error fetching settlements:', error);
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchSettlements();
    }
  }, [groupId]);

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-card-foreground">
            <Handshake className="w-5 h-5 text-blue-500" />
            <span>Settlement History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading settlements...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (settlements.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-card-foreground">
            <Handshake className="w-5 h-5 text-blue-500" />
            <span>Settlement History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💳</div>
            <p className="text-muted-foreground">No settlements yet</p>
            <p className="text-sm text-muted-foreground/70">
              Settlements will appear here once recorded
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSettled = settlements.reduce((sum, settlement) => sum + settlement.amount, 0);

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-card-foreground">
            <Handshake className="w-5 h-5 text-blue-500" />
            <span>Settlement History</span>
          </div>
          <Badge variant="secondary" className="text-sm">
            ${totalSettled.toFixed(2)} settled
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {settlements.map((settlement) => (
            <div
              key={settlement.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                  <Handshake className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-card-foreground">
                      ${settlement.amount.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {settlement.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(settlement.date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <CreditCard className="w-3 h-3" />
                      <span>{settlement.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              </div>
              {settlement.notes && (
                <div className="text-xs text-muted-foreground max-w-32 truncate">
                  {settlement.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
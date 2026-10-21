import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExpenseStore } from '@/stores/expenseStore';
import { useGroupLedger } from '@/stores/useLedger';
import { formatMoney, toCents } from '@/lib/money';
import { Handshake, Calendar, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from "@/lib/dates";
import { deferWithUndo, useHidden } from '@/lib/undo';
import { methodLabel } from '@/lib/paymentMethods';

interface SettlementSummaryProps {
  groupId: string;
}

export const SettlementSummary: React.FC<SettlementSummaryProps> = ({ groupId }) => {
  const settlements = useExpenseStore((s) => s.groupSettlements[groupId]);
  const removeSettlement = useExpenseStore((s) => s.removeSettlement);
  const hidden = useHidden((s) => s.hidden);
  const { user } = useAuth();
  const view = useGroupLedger(groupId);
  const loading = settlements === undefined;
  const list = (settlements ?? []).filter((s) => !hidden.has(`payment-${s.id}`));
  const role = view?.group.members.find((m) => m.id === user?.uid)?.role;
  const canWrite = role === 'admin' || role === 'member';
  const currency = view?.currency ?? 'USD';
  const memberIds = new Set(view?.group.members.map((m) => m.id) ?? []);
  const counted = (s: { fromMemberId: string; toMemberId: string }) => memberIds.has(s.fromMemberId) && memberIds.has(s.toMemberId);
  const totalSettled = list.filter(counted).reduce((sum, s) => sum + toCents(s.amount), 0);

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border ">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-card-foreground">
            <Handshake className="w-5 h-5 text-muted-foreground" />
            <span>Payments</span>
          </div>
          {list.length > 0 && (
            <Badge variant="secondary" className="text-sm tabular-nums">
              {formatMoney(totalSettled, currency)} settled
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-4 text-center text-muted-foreground">Loading payments…</p>
        ) : list.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No payments yet</p>
            <p className="text-sm text-muted-foreground">They show up here when someone marks a debt as paid.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {list.map((settlement) => {
              const isCounted = counted(settlement);
              return (
                <div
                  key={settlement.id}
                  className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="flex min-w-0 items-center space-x-3">
                    <div className="w-8 h-8 shrink-0 bg-settled/10 rounded-full flex items-center justify-center border border-settled/40">
                      <Handshake className="w-4 h-4 text-settled" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm font-medium tabular-nums text-card-foreground">
                          {formatMoney(toCents(settlement.amount), currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {settlement.fromMemberId === user?.uid ? 'You' : view?.person(settlement.fromMemberId).name} paid{' '}
                          {settlement.toMemberId === user?.uid ? 'you' : view?.person(settlement.toMemberId).name}
                        </span>
                        {!isCounted && (
                          <Badge variant="outline" className="text-xs">
                            not counted: not in this group
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(settlement.date)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <CreditCard className="w-3 h-3" />
                          <span>{methodLabel(settlement.paymentMethod)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {settlement.notes && (
                      <div className="text-xs text-muted-foreground max-w-32 truncate">{settlement.notes}</div>
                    )}
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        aria-label={`Remove the ${formatMoney(toCents(settlement.amount), currency)} payment`}
                        onClick={() =>
                          deferWithUndo({
                            id: `payment-${settlement.id}`,
                            title: 'Payment removed',
                            description: 'Balances are back to how they were before it.',
                            run: () => removeSettlement(settlement.id),
                          })
                        }
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExpenseStore } from '@/stores/expenseStore';
import { useGroupLedger } from '@/stores/useLedger';
import { formatMoney, toCents } from '@/lib/money';
import { Handshake, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

import { formatDate } from "@/lib/dates";
interface SettlementSummaryProps {
  groupId: string;
}

export const SettlementSummary: React.FC<SettlementSummaryProps> = ({ groupId }) => {
  const settlements = useExpenseStore((s) => s.groupSettlements[groupId]);
  const view = useGroupLedger(groupId);
  const loading = settlements === undefined;
  const list = settlements ?? [];
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
            <span>Settlement History</span>
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
          <p className="py-4 text-center text-muted-foreground">Loading settlements…</p>
        ) : list.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No settlements yet</p>
            <p className="text-sm text-muted-foreground">Payments appear here once someone settles up.</p>
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
                    <div className="w-8 h-8 shrink-0 bg-settled rounded-full flex items-center justify-center border border-settled/40">
                      <Handshake className="w-4 h-4 text-settled" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm font-medium tabular-nums text-card-foreground">
                          {formatMoney(toCents(settlement.amount), currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {view?.person(settlement.fromMemberId).name} paid {view?.person(settlement.toMemberId).name}
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
                          <span>{settlement.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {settlement.notes && (
                    <div className="text-xs text-muted-foreground max-w-32 truncate">{settlement.notes}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

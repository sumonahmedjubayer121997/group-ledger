import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LitPanel } from '@/components/fx/LitPanel';
import { glass, glassRow } from '@/components/fx/glass';
import { useExpenseStore } from '@/stores/expenseStore';
import { useGroupLedger } from '@/stores/useLedger';
import { formatMoney, toCents } from '@/lib/money';
import { Handshake, Calendar, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from "@/lib/dates";
import { deferWithUndo, useHidden } from '@/lib/undo';
import { methodLabel } from '@/lib/paymentMethods';
import { cn } from '@/lib/utils';

interface SettlementSummaryProps {
  groupId: string;
}

export const SettlementSummary: React.FC<SettlementSummaryProps> = ({ groupId }) => {
  const settlements = useExpenseStore((s) => s.groupSettlements[groupId]);
  const removeSettlement = useExpenseStore((s) => s.removeSettlement);
  const hidden = useHidden((s) => s.hidden);
  const { user } = useAuth();
  const reduce = useReducedMotion();
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
    <LitPanel tone={list.length > 0 ? 'settled' : 'plain'} light="top-left">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-xl">
          <span className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            Payments
          </span>
          {list.length > 0 && (
            <span className={cn('money rounded-full px-2.5 py-0.5 font-sans text-sm text-settled', glass)}>
              {formatMoney(totalSettled, currency)} settled
            </span>
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
          // A little room around the rows, so their hover lift isn't clipped by the scroll area.
          <ul className="-m-1 max-h-72 space-y-2 overflow-y-auto p-1">
            <AnimatePresence initial={false}>
              {list.map((settlement, i) => {
                const isCounted = counted(settlement);
                return (
                  // Removing a payment fades it out; Undo brings it back.
                  <motion.li
                    key={settlement.id}
                    layout={reduce ? false : 'position'}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                    transition={{ duration: 0.28, delay: Math.min(i, 6) * 0.04 }}
                  >
                    <div className={cn('flex items-center justify-between gap-3 px-3 py-2.5', glassRow)}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-settled/40 bg-settled/10" aria-hidden="true">
                          <Handshake className="h-4 w-4 text-settled" />
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
                          <div className="mt-1 flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" aria-hidden="true" />
                              <span>{formatDate(settlement.date)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CreditCard className="h-3 w-3" aria-hidden="true" />
                              <span>{methodLabel(settlement.paymentMethod)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {settlement.notes && <div className="max-w-32 truncate text-xs text-muted-foreground">{settlement.notes}</div>}
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
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </LitPanel>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { useGroupLedger } from '@/stores/useLedger';
import { subscribeToGroupActivities, type GroupActivityRecord } from '@/services/firebaseService';
import { formatAmount, toCurrencyCode } from '@/lib/money';
import { Activity, DollarSign, Trash, Edit, UserPlus, UserMinus, Handshake } from 'lucide-react';

import { formatDateTime } from "@/lib/dates";
interface GroupActivityFeedProps {
  group: Group;
}

type FeedItem = {
  id: string;
  type: GroupActivityRecord['type'] | 'expense_added' | 'settlement_made';
  who: string;
  text: string;
  at: Date;
};

const toDate = (value: unknown, fallback: Date) => {
  const v = value as { toDate?: () => Date } | Date | string | undefined;
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') return (v as { toDate: () => Date }).toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string') return new Date(v);
  return fallback;
};

const icons: Record<FeedItem['type'], React.ReactNode> = {
  expense_added: <DollarSign className="w-4 h-4 text-settled" />,
  expense_updated: <Edit className="w-4 h-4 text-muted-foreground" />,
  expense_deleted: <Trash className="w-4 h-4 text-destructive" />,
  member_added: <UserPlus className="w-4 h-4 text-settled" />,
  member_removed: <UserMinus className="w-4 h-4 text-destructive" />,
  settlement_made: <Handshake className="w-4 h-4 text-muted-foreground" />,
  group_updated: <Edit className="w-4 h-4 text-muted-foreground" />,
};

const labels: Record<FeedItem['type'], string> = {
  expense_added: 'expense',
  expense_updated: 'edit',
  expense_deleted: 'deleted',
  member_added: 'member',
  member_removed: 'member',
  settlement_made: 'payment',
  group_updated: 'group',
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Everything that happened in a group, newest first: expenses and payments (their own records)
 * plus the activity log (edits, deletions, membership changes).
 */
export const GroupActivityFeed: React.FC<GroupActivityFeedProps> = ({ group }) => {
  const expenses = useExpenseStore((s) => s.expenses);
  const ledger = useGroupLedger(group.id);
  const settlements = useExpenseStore((s) => s.groupSettlements[group.id]);
  const [logged, setLogged] = useState<GroupActivityRecord[]>([]);
  const currency = toCurrencyCode(group.settings?.currency);

  useEffect(() => subscribeToGroupActivities(group.id, setLogged), [group.id]);

  const items = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = logged.map((a) => ({ id: a.id, type: a.type, who: a.actorName, text: a.description, at: a.createdAt }));
    for (const e of expenses) {
      if (e.groupId !== group.id) continue;
      const createdAt = toDate((e as unknown as { createdAt?: unknown }).createdAt, new Date(e.date));
      out.push({
        id: `expense-${e.id}`,
        type: 'expense_added',
        who: e.paidBy?.name ?? 'Someone',
        text: `paid ${formatAmount(e.amount, currency)} for "${e.description}"`,
        at: createdAt,
      });
    }
    for (const s of settlements ?? []) {
      out.push({
        id: `settlement-${s.id}`,
        type: 'settlement_made',
        who: ledger?.person(s.fromMemberId).name ?? 'Someone',
        text: `paid ${ledger?.person(s.toMemberId).name ?? 'someone'} ${formatAmount(s.amount, currency)}`,
        at: new Date(s.date),
      });
    }
    return out.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 100);
  }, [logged, expenses, settlements, group.id, currency, ledger]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Activity Feed</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground">Expenses, payments and member changes will appear here.</p>
          </div>
        ) : (
          <ol className="space-y-3 max-h-[32rem] overflow-y-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0} aria-label="Group activity">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background" aria-hidden="true">
                  {icons[item.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] font-semibold">{initials(item.who || 'U')}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{item.who}</span>
                    <Badge variant="outline" className="text-xs">{labels[item.type]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{item.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <time dateTime={item.at.toISOString()}>{formatDateTime(item.at)}</time>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CardTitle } from '@/components/ui/card';
import { LitPanel } from '@/components/fx/LitPanel';
import { glass } from '@/components/fx/glass';
import { MessageCircle, Pin, CheckSquare, BarChart3 } from 'lucide-react';
import { GroupChat } from './GroupChat';
import { GroupPinnedNotes } from './GroupPinnedNotes';
import { GroupTasks } from './GroupTasks';
import { GroupPolls } from './GroupPolls';
import { Group } from '@/stores/expenseStore';
import { cn } from '@/lib/utils';

interface GroupCommunicationHubProps {
  group: Group;
  isAdmin: boolean;
}

export const GroupCommunicationHub: React.FC<GroupCommunicationHubProps> = ({ group, isAdmin }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'tasks' | 'polls'>('chat');
  const reduce = useReducedMotion();

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'notes', label: 'Notes', icon: Pin },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'polls', label: 'Polls', icon: BarChart3 },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'chat':
        return <GroupChat groupId={group.id} />;
      case 'notes':
        return <GroupPinnedNotes groupId={group.id} isAdmin={isAdmin} />;
      case 'tasks':
        return <GroupTasks groupId={group.id} members={group.members} />;
      case 'polls':
        return <GroupPolls groupId={group.id} />;
      default:
        return <GroupChat groupId={group.id} />;
    }
  };

  return (
    <LitPanel light="top" className="h-full">
      <div className="border-b border-[color:var(--fx-rim)] p-3 sm:p-4">
        <CardTitle className="sr-only">Chat and notes</CardTitle>
        {/* A glass switch; the lit pill slides to the one that's showing. Four across on a phone. */}
        <div className={cn('grid w-full grid-cols-4 gap-1 rounded-full p-1 sm:inline-grid sm:w-auto', glass)} role="group" aria-label="Show">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'relative inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3.5',
                  active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`hub-pill-${group.id}`}
                    className="absolute inset-0 rounded-full bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="relative h-4 w-4 max-[379px]:hidden" aria-hidden="true" />
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-full">{renderActiveComponent()}</div>
    </LitPanel>
  );
};


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageCircle, Pin, CheckSquare, BarChart3 } from 'lucide-react';
import { GroupChat } from './GroupChat';
import { GroupPinnedNotes } from './GroupPinnedNotes';
import { GroupTasks } from './GroupTasks';
import { GroupPolls } from './GroupPolls';
import { Group } from '@/stores/expenseStore';

interface GroupCommunicationHubProps {
  group: Group;
  isAdmin: boolean;
}

export const GroupCommunicationHub: React.FC<GroupCommunicationHubProps> = ({ group, isAdmin }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'tasks' | 'polls'>('chat');
  const isMobile = useIsMobile();

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageCircle, component: GroupChat },
    { id: 'notes', label: 'Notes', icon: Pin, component: GroupPinnedNotes },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, component: GroupTasks },
    { id: 'polls', label: 'Polls', icon: BarChart3, component: GroupPolls },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <Card className="h-full">
      <CardHeader className={`${isMobile ? 'p-3' : 'p-4'} border-b`}>
        <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'}`}>
          Communication & Notes
        </CardTitle>
        <div className={`flex ${isMobile ? 'flex-wrap gap-1' : 'gap-2'} mt-3`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size={isMobile ? "sm" : "default"}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {!isMobile && tab.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 h-full">
        <div className="h-full">
          {ActiveComponent && (
            <ActiveComponent
              groupId={group.id}
              isAdmin={isAdmin}
              members={group.members}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

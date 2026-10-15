
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
    <Card className="h-full">
      <CardHeader className={`${isMobile ? 'p-3' : 'p-4'} border-b`}>
        <CardTitle className="sr-only">Chat and notes</CardTitle>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
              >
                <Icon aria-hidden="true" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 h-full">
        <div className="h-full">
          {renderActiveComponent()}
        </div>
      </CardContent>
    </Card>
  );
};

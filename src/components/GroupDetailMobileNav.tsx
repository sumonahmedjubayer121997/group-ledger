
import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface GroupDetailMobileNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const GroupDetailMobileNav: React.FC<GroupDetailMobileNavProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div className="px-4 py-3">
      <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className="relative flex items-center space-x-2 whitespace-nowrap min-w-fit h-8 px-3"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-xs font-medium"
                >
                  {tab.label}
                </motion.span>
              )}
              {!isActive && (
                <span className="sr-only">{tab.label}</span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

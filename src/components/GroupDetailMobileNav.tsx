
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
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b px-4 py-2">
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
              className="relative flex items-center space-x-2 whitespace-nowrap min-w-fit"
            >
              <Icon className="w-4 h-4" />
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium"
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

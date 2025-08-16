import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

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
    <div className="w-full px-1">
      <div className="flex w-full overflow-x-auto scrollbar-hide space-x-1 justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Button
              key={tab.id || tab.label}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange(tab.id || tab.label)}
              className={`flex flex-col items-center justify-center min-w-0 px-1 py-2 h-14 flex-1 touch-manipulation ${
                isActive
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              } transition-colors duration-200`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium truncate max-w-full leading-tight">
                {tab.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

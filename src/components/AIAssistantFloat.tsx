import React, { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SplitWizeAIChat from './SplitWizeAIChat';

export const AIAssistantFloat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating AI Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200 hover:scale-105"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* AI Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>AI Assistant</DialogTitle>
          </DialogHeader>
          <SplitWizeAIChat />
        </DialogContent>
      </Dialog>
    </>
  );
};
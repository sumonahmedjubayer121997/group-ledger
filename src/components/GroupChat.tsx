
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { Send, MessageCircle, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatMessage, 
  sendChatMessage, 
  subscribeToGroupChat,
  getMessageCount
} from '@/services/groupCommunicationService';

interface GroupChatProps {
  groupId: string;
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [messageLimit, setMessageLimit] = useState(10);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const { user, userProfile } = useAuth();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;
    
    const unsubscribe = subscribeToGroupChat(groupId, messageLimit, (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return unsubscribe;
  }, [groupId, messageLimit]);

  useEffect(() => {
    const fetchMessageCount = async () => {
      const count = await getMessageCount(groupId);
      setTotalMessageCount(count);
    };
    
    fetchMessageCount();
  }, [groupId, messages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !userProfile || sending) return;

    setSending(true);
    try {
      await sendChatMessage(groupId, user.uid, userProfile.name, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleShowMore = () => {
    setMessageLimit(100);
    setShowMore(true);
  };

  const canShowMore = totalMessageCount > 10 && !showMore;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className={`${isMobile ? 'p-3' : 'p-4'} border-b`}>
        <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
          <MessageCircle className="w-5 h-5" />
          Group Chat
          {totalMessageCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({totalMessageCount} messages)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {canShowMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowMore}
                  className="text-xs"
                >
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show More Messages
                </Button>
              </div>
            )}
            
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={`flex gap-3 ${
                      message.senderId === user?.uid ? 'justify-end' : 'justify-start'
                    }`}
                    onMouseEnter={() => setHoveredMessage(message.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    {message.senderId !== user?.uid && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {message.senderName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="relative max-w-[70%] group">
                      <div
                        className={`${
                          message.senderId === user?.uid
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        } rounded-lg p-3 relative`}
                      >
                        {message.senderId !== user?.uid && (
                          <div className="text-xs font-medium mb-1 opacity-70">
                            {message.senderName}
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-wrap">
                          {message.text}
                        </div>
                      </div>
                      
                      {/* Timestamp tooltip */}
                      <AnimatePresence>
                        {hoveredMessage === message.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`absolute z-10 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border ${
                              message.senderId === user?.uid
                                ? 'right-0 -top-8'
                                : 'left-0 -top-8'
                            }`}
                          >
                            {format(message.createdAt, 'MMM d, HH:mm')}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {message.senderId === user?.uid && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {message.senderName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size={isMobile ? "sm" : "default"}
              className="flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

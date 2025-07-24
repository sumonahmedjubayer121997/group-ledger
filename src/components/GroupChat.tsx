
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { Send, MessageCircle } from 'lucide-react';
import { 
  ChatMessage, 
  sendChatMessage, 
  subscribeToGroupChat 
} from '@/services/groupCommunicationService';

interface GroupChatProps {
  groupId: string;
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user, userProfile } = useAuth();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;
    
    const unsubscribe = subscribeToGroupChat(groupId, (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return unsubscribe;
  }, [groupId]);

  useEffect(() => {
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className={`${isMobile ? 'p-3' : 'p-4'} border-b`}>
        <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
          <MessageCircle className="w-5 h-5" />
          Group Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.senderId === user?.uid ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.senderId !== user?.uid && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {message.senderName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[70%] ${
                      message.senderId === user?.uid
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    } rounded-lg p-3`}
                  >
                    {message.senderId !== user?.uid && (
                      <div className="text-xs font-medium mb-1">
                        {message.senderName}
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    <div className={`text-xs mt-1 ${
                      message.senderId === user?.uid
                        ? 'text-blue-100'
                        : 'text-gray-500'
                    }`}>
                      {format(message.timestamp, 'HH:mm')}
                      {message.edited && ' (edited)'}
                    </div>
                  </div>
                  
                  {message.senderId === user?.uid && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {message.senderName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t">
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
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';

// Message interface to define the structure of chat messages
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

// Main SplitWize AI Chat Component
const SplitWizeAIChat: React.FC = () => {
  // State management for chat functionality
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your SplitWize AI Assistant. I can help you with expense tracking, group management, budget planning, and financial tips. How can I assist you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API Key placeholder - will be provided by environment
  const apiKey = "";

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to simulate RAG context retrieval
  // In a real implementation, this would fetch relevant context from Firebase, documentation, etc.
  const getRetrievedContext = (userMessage: string): string => {
    // Placeholder for dynamic context retrieval based on user query
    // This would typically involve:
    // 1. Analyzing user query to determine intent
    // 2. Searching relevant documents/database for context
    // 3. Returning the most relevant information
    
    const contextDatabase = {
      expenses: `
        SplitWize Expense Features:
        - Add individual expenses with amount, category, and description
        - Split expenses among group members equally or by custom amounts
        - Support for multiple currencies
        - Expense categories: Food, Transportation, Accommodation, Entertainment, Utilities, Other
        - Photo attachments for receipts
        - Recurring expense setup
        - Expense editing and deletion
        - Real-time expense tracking
      `,
      groups: `
        SplitWize Group Management:
        - Create groups for different occasions (trips, roommates, events)
        - Invite members via email or sharing group codes
        - Set group descriptions and images
        - Manage group member permissions
        - View group expense history and analytics
        - Settlement tracking and payment reminders
        - Group chat and communication features
      `,
      budgets: `
        SplitWize Budget Features:
        - Set spending limits for categories or overall budgets
        - Weekly, monthly, and yearly budget periods
        - Alert thresholds when approaching budget limits
        - Budget progress tracking with visual indicators
        - Overspending notifications and warnings
        - Budget vs actual spending analytics
      `,
      settlements: `
        SplitWize Settlement System:
        - Automatic calculation of who owes whom
        - Simplified settlement suggestions to minimize transactions
        - Mark settlements as paid
        - Settlement history tracking
        - Payment reminders and notifications
        - Multiple payment method support
      `
    };

    // Simple keyword matching for context retrieval
    // In production, this would use more sophisticated NLP/vector search
    const lowerQuery = userMessage.toLowerCase();
    
    if (lowerQuery.includes('expense') || lowerQuery.includes('cost') || lowerQuery.includes('spend')) {
      return contextDatabase.expenses;
    } else if (lowerQuery.includes('group') || lowerQuery.includes('member') || lowerQuery.includes('invite')) {
      return contextDatabase.groups;
    } else if (lowerQuery.includes('budget') || lowerQuery.includes('limit') || lowerQuery.includes('alert')) {
      return contextDatabase.budgets;
    } else if (lowerQuery.includes('settle') || lowerQuery.includes('owe') || lowerQuery.includes('payment')) {
      return contextDatabase.settlements;
    }
    
    // Return general SplitWize information as fallback
    return `
      SplitWize is a comprehensive expense splitting application that helps users:
      - Track shared expenses with friends, family, and groups
      - Manage budgets and spending limits
      - Settle debts and payments efficiently
      - Analyze spending patterns and trends
      - Communicate with group members
      - Handle multiple currencies and payment methods
    `;
  };

  // Main function to send message to Gemini API with RAG implementation
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message to chat
    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // RAG Implementation: Retrieve relevant context based on user query
      const retrievedContext = getRetrievedContext(userMessage);

      // Prepare conversation history for API call
      const conversationHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Add current user message to history
      conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      // System instruction with RAG context injection
      const systemInstruction = `
        You are a helpful, friendly, and highly knowledgeable AI assistant for SplitWize, an expense tracking and splitting application.

        [CONTEXT]
        ${retrievedContext}
        [/CONTEXT]

        CRITICAL INSTRUCTIONS:
        1. PRIORITIZE information from the [CONTEXT] section above when answering questions
        2. Synthesize and integrate context information naturally into your responses
        3. Only fallback to general knowledge if the context is insufficient for the user's query
        4. NEVER hallucinate or make up information about SplitWize features
        5. If you don't have specific information in the context, clearly state that and offer general guidance

        Your knowledge domains include:
        - SplitWize features (expenses, groups, settlements, budgets)
        - Basic financial tips and best practices
        - Expense tracking methodologies
        - Group financial management

        Maintain a positive, supportive, and concise tone. 
        Politely decline to provide complex financial, medical, or legal advice.
        If asked about topics outside your scope, redirect users to appropriate resources or suggest contacting SplitWize support.
      `;

      // API call to Gemini with RAG-enhanced system instruction
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract AI response from API response
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                        "I apologize, but I'm having trouble processing your request right now. Please try again.";

      // Add AI response to chat
      const newAIMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newAIMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // User-friendly error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error while processing your message. Please check your internet connection and try again. If the problem persists, please contact SplitWize support.",
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press in input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp for message display
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white">
      {/* Chat Header */}
      <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
          <Bot className="w-8 h-8 text-blue-600" />
          SplitWize AI Assistant
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Your intelligent companion for expense tracking, budgeting, and financial management
        </p>
      </CardHeader>

      {/* Messages Container */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96 lg:max-h-[500px]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.sender === 'user' 
                ? 'bg-blue-500' 
                : 'bg-green-500'
            }`}>
              {message.sender === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Message Bubble */}
            <div className={`flex-1 max-w-[80%] ${
              message.sender === 'user' ? 'text-right' : 'text-left'
            }`}>
              <div className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.text}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1 px-2">
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Bar */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about SplitWize features, expense tracking, or budgeting..."
            disabled={isLoading}
            className="flex-1 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send • AI responses are generated using advanced language models
        </p>
      </div>
    </div>
  );
};

export default SplitWizeAIChat;
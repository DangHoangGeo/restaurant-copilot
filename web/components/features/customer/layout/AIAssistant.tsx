"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
// We'll add translations later if needed

interface AIAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  restaurantName: string;
  currentContext: 'menu' | 'cart' | 'order';
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistant({ 
  isOpen, 
  onToggle, 
  restaurantName, 
  currentContext 
}: AIAssistantProps) {
  // We'll use hardcoded strings for now instead of translations
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Pre-defined responses for quick implementation
  const responses = React.useMemo(() => ({
    greeting: `Hi! I'm your dining assistant at ${restaurantName}. How can I help you today?`,
    menuHelp: "I can help you find the perfect dish! What are you in the mood for?",
    popular: "Our most popular items are our signature burgers, fresh salads, and house special pasta.",
    dietary: "We have many options for dietary restrictions including gluten-free, vegetarian, and vegan dishes.",
    recommendation: "Based on popular choices right now, I'd recommend trying our chef's special.",
    orderHelp: "Need help with your order? I can assist with special requests or answer questions about any dish.",
    thankYou: "You're welcome! Enjoy your meal at " + restaurantName + "!"
  }), [restaurantName]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send initial greeting when opened for first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: '1',
          sender: 'assistant',
          content: responses.greeting,
          timestamp: new Date(),
        }
      ]);
    }
  }, [isOpen, messages.length, responses]);

  // Context-aware suggested prompts based on current view
  const getSuggestedPrompts = () => {
    switch (currentContext) {
      case 'menu':
        return [
          "What's popular here?",
          "Any vegetarian options?",
          "What do you recommend?"
        ];
      case 'cart':
        return [
          "Can you recommend something?",
          "Help with my order",
          "Special dietary needs"
        ];
      case 'order':
        return [
          "How long until my food arrives?",
          "I want to add more items",
          "How do I pay?"
        ];
      default:
        return [
          "What's popular here?",
          "I need help",
          "Can you recommend something?"
        ];
    }
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: userInput,
      timestamp: new Date(),
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setUserInput('');
    
    // Generate simple response based on keywords
    setTimeout(() => {
      let responseContent = '';
      const lowerInput = userInput.toLowerCase();
      
      if (lowerInput.includes('popular') || lowerInput.includes('best')) {
        responseContent = responses.popular;
      } else if (lowerInput.includes('recommend') || lowerInput.includes('suggest')) {
        responseContent = responses.recommendation;
      } else if (lowerInput.includes('vegan') || lowerInput.includes('vegetarian') || 
                lowerInput.includes('gluten') || lowerInput.includes('allergy')) {
        responseContent = responses.dietary;
      } else if (lowerInput.includes('thank')) {
        responseContent = responses.thankYou;
      } else if (lowerInput.includes('help') || lowerInput.includes('how')) {
        responseContent = responses.orderHelp;
      } else {
        responseContent = responses.menuHelp;
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
    }, 600);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setUserInput(prompt);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 rounded-full shadow-xl p-3 z-50"
        aria-label="Open virtual assistant"
        size="icon"
        variant="default"
      >
        <MessageCircle size={24} />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-96 bg-white dark:bg-slate-800 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="p-3 bg-primary text-white flex justify-between items-center">
        <h3 className="font-semibold">Restaurant Assistant</h3>
        <Button
          onClick={onToggle}
          variant="ghost"
          size="icon"
          aria-label="Close virtual assistant"
          className="h-8 w-8 text-white hover:text-white hover:bg-primary/80"
        >
          <X size={18} />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-900">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-lg p-3 ${
                msg.sender === 'user' 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {msg.content}
              <div className={`text-xs mt-1 ${
                msg.sender === 'user' ? 'text-primary-foreground/75' : 'text-slate-500'
              }`}>
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {messages.length > 0 && messages[messages.length - 1].sender === 'assistant' && (
        <div className="p-2 bg-slate-100 dark:bg-slate-800 flex flex-wrap gap-2">
          {getSuggestedPrompts().map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSuggestedPrompt(prompt)}
              className="text-xs py-1 px-2 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
      
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about the menu..."
          className="flex-1 p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
          aria-label="Type your message"
        />
        <Button 
          onClick={handleSendMessage}
          disabled={!userInput.trim()}
          size="sm"
        >
          Send
        </Button>
      </div>
    </div>
  );
}

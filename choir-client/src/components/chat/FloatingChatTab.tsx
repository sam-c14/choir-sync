import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { apiClient } from '../../lib/api-client';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export function FloatingChatTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const newMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to local state
    setMessages(prev => [...prev, { role: 'user', content: newMessage }]);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/ai/chat', {
        messages: messages,
        newMessage
      });

      setMessages(prev => [...prev, { role: 'model', content: response.data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: "Sorry, I'm having trouble connecting right now." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Edge anchored trigger button */}
      <div className="fixed -right-2 top-1/2 -translate-y-1/2 z-40">
        <Button 
          onClick={() => setIsOpen(true)}
          className="rounded-l-full rounded-r-none pb-0.5 h-9 pl-3 pr-3 shadow-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
        >
          <MessageCircle className="w-10 h-10 mr-0" />
          {/* <span className="font-semibold tracking-wide">Copilot</span> */}
        </Button>
      </div>

      {/* Slide-over Drawer Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-over Drawer */}
      <div 
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              ChoirSync Copilot
            </h2>
            <p className="text-xs text-muted-foreground">Ask about vocal tips, harmonies, or theory</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Message Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm mt-8">
              Hello! I'm your AI assistant. How can I help you with your singing or rehearsal today?
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2 flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <Input 
              placeholder="Ask a question..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 rounded-full"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="rounded-full shrink-0" 
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

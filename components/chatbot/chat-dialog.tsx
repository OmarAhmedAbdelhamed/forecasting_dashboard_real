'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Textarea } from '@/components/ui/shared/textarea';
import { Send, Loader2, Sparkles, X, ShieldCheck } from 'lucide-react';
import { useDashboardContext } from '@/contexts/dashboard-context';
import { BeeLogo } from '@/components/ui/shared/logo';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatApiSuccessResponse {
  response: string;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatDialog({ open, onOpenChange }: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Merhaba! Ben Bee2 AI asistanınızım. Dashboard verileriniz hakkında sorularınızı yanıtlayabilirim. 🐝',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getContext, filters, section, metrics } = useDashboardContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) {return;}

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const context = getContext();
      const normalizedMetrics: Record<
      string,
      string | number | boolean | null
      > = Object.fromEntries(
        Object.entries(metrics ?? {}).map(([key, value]) => {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            value === null
          ) {
            return [key, value];
          }
          return [key, String(value)];
        }),
      );

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context,
          filters,
          section,
          metrics: normalizedMetrics,
          history: messages.slice(-6),
        }),
      });

      if (!response.ok) {throw new Error('Failed to get response');}

      const data = (await response.json()) as ChatApiSuccessResponse;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  if (!open) {return null;}

  return (
    <div
      className={cn(
        'fixed bottom-24 right-6 z-50 flex flex-col w-[440px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 transform animate-in fade-in slide-in-from-bottom-4',
      )}
    >
      {/* Header */}
      <div className='flex items-center justify-between px-5 py-4 border-b bg-slate-50/50 backdrop-blur-sm'>
        <div className='flex items-center gap-3'>
          <div className='p-1.5 bg-white border border-slate-100 rounded-xl shadow-sm'>
            <BeeLogo className='w-7 h-7' />
          </div>
          <div>
            <h3 className='text-[15px] font-semibold text-slate-900 leading-tight'>
              Bee2 AI Assistant
            </h3>
            <div className='flex items-center gap-1.5 mt-0.5'>
              <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
              <span className='text-[11px] font-medium text-slate-500 uppercase tracking-wider'>
                Online
              </span>
            </div>
          </div>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => { onOpenChange(false); }}
          className='h-8 w-8 rounded-full hover:bg-slate-200/50 text-slate-500'
        >
          <X className='w-4 h-4' />
        </Button>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto px-5 py-6 space-y-5 bg-slate-50/30'>
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            {message.role === 'assistant' && (
              <div className='w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs'>
                <BeeLogo className='w-5 h-5' />
              </div>
            )}
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs transition-all',
                message.role === 'user'
                  ? 'bg-sidebar text-slate-50 rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none',
              )}
            >
              <p className='text-[13px] leading-relaxed whitespace-pre-wrap'>
                {message.content}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className='flex gap-3 justify-start items-center'>
            <div className='w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 shadow-xs'>
              <BeeLogo className='w-5 h-5' />
            </div>
            <div className='bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-2 shadow-xs'>
              <div className='flex items-center gap-2'>
                <Loader2 className='w-3.5 h-3.5 animate-spin text-amber-600' />
                <span className='text-[12px] text-slate-500 font-medium tracking-tight'>
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className='p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]'>
        <form onSubmit={handleSubmit} className='relative group'>
          <Textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); }}
            placeholder='Type a message...'
            className='w-full min-h-[52px] max-h-[120px] bg-slate-50 border-slate-200 focus:border-slate-300 focus:ring-0 transition-all text-[13px] pr-12 rounded-xl resize-none py-3'
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            type='submit'
            disabled={!input.trim() || isLoading}
            className={cn(
              'absolute right-2 top-[50%] -translate-y-[50%] p-1.5 rounded-lg transition-all',
              input.trim() && !isLoading
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'text-slate-400',
            )}
          >
            {isLoading ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Send className='w-4 h-4' />
            )}
          </button>
        </form>
        <div className='flex items-center justify-between mt-3 px-1'>
          <div className='flex items-center gap-1.5'>
            <ShieldCheck className='w-3 h-3 text-slate-400' />
            <span className='text-[10px] text-slate-400 font-medium uppercase tracking-wider'>
              Enterprise AI Secured
            </span>
          </div>
          <p className='text-[10px] text-slate-400 font-medium flex items-center gap-1'>
            <Sparkles className='w-2.5 h-2.5' />
            Context-aware
          </p>
        </div>
      </div>
    </div>
  );
}

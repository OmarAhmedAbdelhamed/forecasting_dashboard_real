'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChatDialog } from '@/components/chatbot/chat-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); }}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 group',
          isOpen
            ? 'bg-sidebar text-white'
            : 'bg-white border border-slate-200 text-sidebar hover:border-slate-300',
        )}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        <div className='relative flex items-center justify-center w-6 h-6'>
          {isOpen ? (
            <X className='w-5 h-5 animate-in spin-in-90 duration-300' />
          ) : (
            <>
              <Image
                src='/bee2_ai_logo.svg'
                alt='Bee2 AI Logo'
                width={24}
                height={24}
                className='w-full h-full object-contain group-hover:rotate-12 transition-transform'
              />
              <div className='absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
            </>
          )}
        </div>
        <span className='text-sm font-bold tracking-tight'>
          {isOpen ? 'Close' : 'Ask Bee2 AI'}
        </span>
      </button>

      {/* Chat Dialog */}
      <ChatDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden'>
      {/* Abstract Background Shapes - Subtle and Professional */}
      <div className='absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[100px]' />
      <div className='absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-100/40 rounded-full blur-[100px]' />

      {/* Content Container */}
      <div className='relative z-10 w-full max-w-md p-6'>{children}</div>
    </div>
  );
}

import Image from 'next/image';

interface BeeLogoProps {
  className?: string;
}

export function BeeLogo({ className }: BeeLogoProps) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src='/bee2_ai_logo.svg'
        alt='Bee2 AI Logo'
        fill
        className='object-contain'
      />
    </div>
  );
}

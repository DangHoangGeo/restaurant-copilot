'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  count?: number;
  onRate?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StarRating({ value, count, size = 'md', className }: StarRatingProps) {
  const starSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const stars = Array.from({ length: 5 }).map((_, i) => {
    const filled = i < Math.floor(value);
    const halfFilled = i === Math.floor(value) && value % 1 !== 0;
    
    return (
      <Star
        key={i}
        className={cn(
          starSizes[size],
          'text-muted-foreground/30',
          {
            'fill-yellow-400 text-yellow-400': filled || halfFilled,
            'fill-yellow-400/50': halfFilled
          }
        )}
      />
    );
  });

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex">{stars}</div>
      {count !== undefined && (
        <span className={cn('text-muted-foreground', textSizes[size])}>
          ({count})
        </span>
      )}
    </div>
  );
}
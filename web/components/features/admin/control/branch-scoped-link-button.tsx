'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BranchScopedLinkButtonProps {
  restaurantId: string;
  href: string;
  label: string;
  variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function BranchScopedLinkButton({
  restaurantId,
  href,
  label,
  variant = 'outline',
  size = 'sm',
  className,
}: BranchScopedLinkButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  async function handleClick() {
    setHasError(false);

    try {
      const response = await fetch('/api/v1/owner/organization/active-branch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch active branch');
      }
    } catch (error) {
      console.error('Branch switch failed', error);
      setHasError(true);
      return;
    }

    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <Button
      type="button"
      variant={hasError ? 'destructive' : variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

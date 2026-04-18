'use client';

import { useState } from 'react';
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
  openInNewTab?: boolean;
}

export function BranchScopedLinkButton({
  restaurantId,
  href,
  label,
  variant = 'outline',
  size = 'sm',
  className,
  openInNewTab = false,
}: BranchScopedLinkButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleClick() {
    setHasError(false);
    setIsLoading(true);

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
      setIsLoading(false);
      return;
    }

    if (openInNewTab) {
      window.open(href, '_blank', 'noopener,noreferrer');
      setIsLoading(false);
      return;
    }

    router.push(href);
  }

  return (
    <Button
      type="button"
      variant={hasError ? 'destructive' : variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

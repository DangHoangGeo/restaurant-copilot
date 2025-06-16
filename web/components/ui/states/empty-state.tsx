import React from 'react';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  icon,
  className = ""
}: EmptyStateProps) {
  const defaultIcon = <Package className="h-12 w-12 text-gray-400" />;

  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 ${className}`}>
      {icon || defaultIcon}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

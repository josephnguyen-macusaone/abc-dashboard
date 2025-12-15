'use client';

import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface StatusBadgeProps {
  isActive: boolean;
  className?: string;
  canToggle?: boolean;
  onToggle?: () => void;
}

export function StatusBadge({ isActive, className, canToggle = false, onToggle }: StatusBadgeProps) {
  const handleClick = () => {
    if (canToggle && onToggle) {
      onToggle();
    }
  };

  return (
    <Badge
      variant={isActive ? 'active' : 'inactive'}
      className={cn(
        'p-1.5',
        canToggle && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={canToggle ? handleClick : undefined}
      title={canToggle ? `Click to ${isActive ? 'deactivate' : 'activate'}` : undefined}
    >
      {isActive ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
    </Badge>
  );
}
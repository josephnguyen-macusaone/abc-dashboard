'use client';

import { Badge } from '@/presentation/components/atoms/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

export interface StatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function StatusBadge({ isActive, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'active' : 'inactive'}
      className={`p-1.5 ${className}`}
    >
      {isActive ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
    </Badge>
  );
}
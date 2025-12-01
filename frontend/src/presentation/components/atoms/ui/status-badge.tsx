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
      className={`gap-1.5 ${className}`}
    >
      {isActive ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}
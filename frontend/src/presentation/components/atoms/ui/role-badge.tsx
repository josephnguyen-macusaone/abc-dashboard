'use client';

import { Badge } from '@/presentation/components/atoms/ui/badge';
import { ROLE_DEFINITIONS, type UserRoleType } from '@/shared/constants';

export interface RoleBadgeProps {
  role: UserRoleType;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleDef = ROLE_DEFINITIONS[role];

  return (
    <Badge
      variant={roleDef.color}
      className={className}
    >
      {roleDef.displayName}
    </Badge>
  );
}
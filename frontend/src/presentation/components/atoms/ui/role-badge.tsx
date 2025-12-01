'use client';

import { Badge } from '@/presentation/components/atoms/ui/badge';
import { ROLE_DEFINITIONS, type UserRoleType } from '@/shared/constants';
import { Shield, Users, User } from 'lucide-react';

export interface RoleBadgeProps {
  role: UserRoleType;
  className?: string;
}

const roleIcons = {
  admin: Shield,
  manager: Users,
  staff: User,
} as const;

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleDef = ROLE_DEFINITIONS[role];
  const Icon = roleIcons[role];

  return (
    <Badge
      variant={roleDef.color}
      className={`gap-1.5 ${className}`}
    >
      <Icon className="h-3 w-3" />
      {roleDef.displayName}
    </Badge>
  );
}
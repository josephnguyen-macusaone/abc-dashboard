import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { ROLE_DEFINITIONS, USER_ROLE_COLORS, type UserRoleType } from '@/shared/constants/auth';
import { Shield, Users, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/helpers';

export interface UserRoleBadgeProps {
  role: UserRoleType;
  variant?: 'default' | 'icon' | 'minimal';
  className?: string;
  showIcon?: boolean;
}

const roleIcons: Record<UserRoleType, LucideIcon> = {
  admin: Shield,
  manager: Users,
  staff: User,
};

export function UserRoleBadge({
  role,
  variant = 'default',
  className,
  showIcon = true,
}: UserRoleBadgeProps) {
  const roleDef = ROLE_DEFINITIONS[role];
  const colors = USER_ROLE_COLORS[role];
  const IconComponent = roleIcons[role];

  if (variant === 'minimal') {
    return (
      <Badge
        className={cn(colors, 'px-2 py-1 text-xs font-medium justify-center', className)}
        variant="outline"
      >
        {showIcon && IconComponent && (
          <IconComponent className="w-3 h-3 mr-1" />
        )}
        {roleDef.displayName}
      </Badge>
    );
  }

  if (variant === 'icon') {
    return (
      <Badge
        className={cn(colors, 'px-2 py-1 text-xs font-medium justify-center', className)}
        variant="outline"
      >
        {showIcon && IconComponent && (
          <IconComponent className="w-3.5 h-3.5 mr-1.5" />
        )}
        {roleDef.displayName}
      </Badge>
    );
  }

  // Default variant with full styling
  return (
    <Badge
      className={cn(colors, 'px-3 py-1.5 text-xs font-medium shadow-sm justify-center', className)}
      variant="outline"
    >
      {showIcon && IconComponent && (
        <IconComponent className="w-3.5 h-3.5 mr-1.5" />
      )}
      {roleDef.displayName}
    </Badge>
  );
}

// Export role options with icons for use in filters/dropdowns
export const USER_ROLE_OPTIONS_WITH_ICONS = Object.entries(ROLE_DEFINITIONS).map(([key, roleDef]) => ({
  label: roleDef.displayName,
  value: roleDef.name,
  icon: roleIcons[roleDef.name] as React.FC<React.SVGProps<SVGSVGElement>>,
}));

// Legacy export for backward compatibility
export const RoleBadge = UserRoleBadge;
export type RoleBadgeProps = UserRoleBadgeProps;
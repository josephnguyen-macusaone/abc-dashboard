import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/helpers';
import { USER_STATUS_LABELS, USER_STATUS_COLORS } from '@/shared/constants/auth';

export type UserStatus = 'active' | 'inactive';

export interface UserStatusBadgeProps {
  isActive: boolean;
  variant?: 'default' | 'icon' | 'minimal';
  className?: string;
  showIcon?: boolean;
  canToggle?: boolean;
  onToggle?: () => void;
}

const statusIcons: Record<UserStatus, LucideIcon> = {
  active: CheckCircle2,
  inactive: XCircle,
};

export function UserStatusBadge({
  isActive,
  variant = 'default',
  className,
  showIcon = true,
  canToggle = false,
  onToggle,
}: UserStatusBadgeProps) {
  const status: UserStatus = isActive ? 'active' : 'inactive';
  const label = USER_STATUS_LABELS[status];
  const colors = USER_STATUS_COLORS[status];
  const IconComponent = statusIcons[status];

  const handleClick = () => {
    if (canToggle && onToggle) {
      onToggle();
    }
  };

  if (variant === 'minimal') {
    return (
      <Badge
        className={cn(colors, 'px-2 py-1 text-xs font-medium justify-center', className)}
        variant="outline"
        onClick={canToggle ? handleClick : undefined}
        title={canToggle ? `Click to ${isActive ? 'deactivate' : 'activate'}` : undefined}
      >
        {showIcon && IconComponent && (
          <IconComponent className="w-3 h-3 mr-1" />
        )}
        {label}
      </Badge>
    );
  }

  if (variant === 'icon') {
    return (
      <Badge
        className={cn(colors, 'px-2 py-1 text-xs font-medium justify-center', className)}
        variant="outline"
        onClick={canToggle ? handleClick : undefined}
        title={canToggle ? `Click to ${isActive ? 'deactivate' : 'activate'}` : undefined}
      >
        {showIcon && IconComponent && (
          <IconComponent className="w-3 h-3 mr-1" />
        )}
        {label}
      </Badge>
    );
  }

  // Default variant with full styling
  return (
    <Badge
      className={cn(
        colors,
        'px-3 py-1.5 text-xs font-medium shadow-sm justify-center',
        canToggle && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      variant="outline"
      onClick={canToggle ? handleClick : undefined}
      title={canToggle ? `Click to ${isActive ? 'deactivate' : 'activate'}` : undefined}
    >
      {showIcon && IconComponent && (
        <IconComponent className="w-3.5 h-3.5 mr-1.5" />
      )}
      {label}
    </Badge>
  );
}

// Export status options with icons for use in filters/dropdowns
export const USER_STATUS_OPTIONS_WITH_ICONS = Object.entries(USER_STATUS_LABELS).map(([value, label]) => ({
  label,
  value: value as UserStatus,
  icon: statusIcons[value as UserStatus] as React.FC<React.SVGProps<SVGSVGElement>>,
}));

// Legacy export for backward compatibility
export const StatusBadge = UserStatusBadge;
export type StatusBadgeProps = UserStatusBadgeProps;
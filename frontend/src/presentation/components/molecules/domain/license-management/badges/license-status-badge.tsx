import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/helpers';
import { LICENSE_STATUS_LABELS, LICENSE_STATUS_COLORS } from '@/shared/constants/license';
import type { LicenseStatus } from '@/types/license';

export interface LicenseStatusBadgeProps {
  status: LicenseStatus;
  variant?: 'default' | 'icon' | 'minimal' | 'table';
  className?: string;
  showIcon?: boolean;
  /** When set (e.g. SMS payment Approved/Declined), uses same colors/icons as status but this text */
  label?: string;
}

const statusIcons: Record<LicenseStatus, LucideIcon> = {
  active: CheckCircle2,
  cancel: XCircle,
};

export function LicenseStatusBadge({
  status,
  variant = 'default',
  className,
  showIcon = true,
  label: labelOverride,
}: LicenseStatusBadgeProps) {
  const label = labelOverride ?? LICENSE_STATUS_LABELS[status];
  const colors = LICENSE_STATUS_COLORS[status];
  const IconComponent = statusIcons[status];

  /* `table` matches UserRoleBadge minimal: same padding, type, outline + domain colors. */
  if (variant === 'minimal' || variant === 'table') {
    return (
      <Badge
        className={cn(colors, 'px-2 py-1 text-xs font-medium justify-center', className)}
        variant="outline"
      >
        {showIcon && IconComponent ? (
          <IconComponent className="w-3 h-3 mr-1" aria-hidden />
        ) : null}
        {label}
      </Badge>
    );
  }

  if (variant === 'icon') {
    return (
      <Badge
        className={cn(colors, 'px-2 py-1 text-xs font-medium', className)}
        variant="outline"
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
      className={cn(colors, 'px-3 py-1.5 text-xs font-medium shadow-sm', className)}
      variant="outline"
    >
      {showIcon && IconComponent && (
        <IconComponent className="w-3.5 h-3.5 mr-1.5" />
      )}
      {label}
    </Badge>
  );
}

// Export status options with icons for use in filters/dropdowns
export const LICENSE_STATUS_OPTIONS_WITH_ICONS = Object.entries(LICENSE_STATUS_LABELS).map(([value, label]) => ({
  label,
  value: value as LicenseStatus,
  icon: statusIcons[value as LicenseStatus] as React.FC<React.SVGProps<SVGSVGElement>>,
}));

export default LicenseStatusBadge;
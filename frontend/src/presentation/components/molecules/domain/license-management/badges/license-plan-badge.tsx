import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { Star, Crown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/helpers';
import { LICENSE_PLAN_COLORS, LICENSE_PLAN_OPTIONS } from '@/shared/constants/license';
import type { LicensePlan } from '@/shared/constants/license';

const planIcons: Record<LicensePlan, LucideIcon> = {
  Basic: Star,
  Premium: Crown,
};

export interface LicensePlanBadgeProps {
  plan: LicensePlan;
  variant?: 'default' | 'icon' | 'minimal';
  className?: string;
  showIcon?: boolean;
}

export function LicensePlanBadge({
  plan,
  variant = 'default',
  className,
  showIcon = true,
}: LicensePlanBadgeProps) {
  const colors = LICENSE_PLAN_COLORS[plan];
  const IconComponent = planIcons[plan];

  if (variant === 'minimal') {
    return (
      <Badge
        className={cn(colors, 'px-2 py-1 text-xs font-medium justify-center', className)}
        variant="outline"
      >
        {showIcon && IconComponent && (
          <IconComponent className="w-3 h-3 mr-1" />
        )}
        {plan}
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
        {plan}
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
      {plan}
    </Badge>
  );
}

// Export plan options with icons for use in filters/dropdowns
export const LICENSE_PLAN_OPTIONS_WITH_ICONS = LICENSE_PLAN_OPTIONS.map(option => ({
  ...option,
  icon: planIcons[option.value] as React.FC<React.SVGProps<SVGSVGElement>>,
}));

export default LicensePlanBadge;

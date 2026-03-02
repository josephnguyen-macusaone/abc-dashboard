import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { Box, MessageCircle, Printer, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/helpers';
import { LICENSE_PLAN_MODULE_COLORS } from '@/shared/constants/license';
import type { PlanModule } from '@/shared/constants/license';

export interface LicensePlanModuleBadgeProps {
  module: PlanModule | string;
  variant?: 'default' | 'minimal';
  className?: string;
  showIcon?: boolean;
}

const PLAN_MODULES: PlanModule[] = ['Basic', 'Print Check', 'Staff Performance', 'Unlimited SMS'];

const planModuleIcons: Record<PlanModule, LucideIcon> = {
  'Basic': Box,
  'Print Check': Printer,
  'Staff Performance': Users,
  'Unlimited SMS': MessageCircle,
};

function getModuleColors(module: string): string {
  const key = PLAN_MODULES.find((m) => m === module);
  return key ? LICENSE_PLAN_MODULE_COLORS[key] : 'bg-muted text-muted-foreground border-border';
}

function getModuleIcon(module: string): LucideIcon | undefined {
  const key = PLAN_MODULES.find((m) => m === module);
  return key ? planModuleIcons[key] : undefined;
}

export function LicensePlanModuleBadge({
  module,
  variant = 'default',
  className,
  showIcon = true,
}: LicensePlanModuleBadgeProps) {
  const colors = getModuleColors(module);
  const IconComponent = getModuleIcon(module);

  if (variant === 'minimal') {
    return (
      <Badge
        variant="outline"
        className={cn(colors, 'shrink-0 px-2 py-1 text-xs font-medium justify-center', className)}
      >
        {showIcon && IconComponent && (
          <IconComponent className="w-3 h-3 mr-1" />
        )}
        {module}
      </Badge>
    );
  }

  // Default: match LicenseStatusBadge (px-3 py-1.5 text-xs font-medium shadow-sm, icon w-3.5 h-3.5 mr-1.5)
  return (
    <Badge
      variant="outline"
      className={cn(colors, 'shrink-0 px-3 py-1.5 text-xs font-medium shadow-sm', className)}
    >
      {showIcon && IconComponent && (
        <IconComponent className="w-3.5 h-3.5 mr-1.5" />
      )}
      {module}
    </Badge>
  );
}

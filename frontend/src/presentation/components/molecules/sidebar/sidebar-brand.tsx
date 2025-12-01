'use client';

import { Logo } from '@/presentation/components/atoms';
import { useTheme } from '@/presentation/contexts/theme-context';

export interface SidebarBrandProps {
  className?: string;
}

export function SidebarBrand({ className }: SidebarBrandProps) {
  const { theme } = useTheme();
  return (
    <div className={`flex shrink-0 items-center justify-center px-6 pt-6 pb-4 ${className || ''}`}>
      <Logo
        variant={theme === 'dark' ? 'dark' : 'light'}
        width={120}
        height={40}
        className="mx-auto"
      />
    </div>
  );
}


'use client';

import { Logo } from '@/presentation/components/atoms';
import { useTheme } from '@/presentation/contexts/theme-context';

export interface SidebarBrandProps {
  onClick: () => void;
  className?: string;
}

export function SidebarBrand({ onClick, className }: SidebarBrandProps) {
  const { theme } = useTheme();
  return (
    <div
      className={`flex shrink-0 items-center justify-center px-6 pt-6 pb-4 cursor-pointer hover:opacity-80 transition-opacity ${className || ''}`}
      onClick={onClick}
    >
      <Logo
        variant={theme === 'dark' ? 'dark' : 'light'}
        width={120}
        height={40}
        className="mx-auto"
      />
    </div>
  );
}


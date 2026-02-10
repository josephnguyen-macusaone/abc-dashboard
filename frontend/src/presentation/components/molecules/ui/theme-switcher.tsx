'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { TooltipWrapper } from '@/presentation/components/molecules/ui/tooltip-wrapper';
import { useTheme } from '@/presentation/hooks/use-theme';
import { cn } from '@/shared/helpers';

export function ThemeSwitcher() {
  const { toggleTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tooltipText = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const Icon = isDark ? Moon : Sun;

  return (
    <TooltipWrapper content={tooltipText} side="bottom">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="h-9 w-9"
        aria-label={tooltipText}
      >
        <Icon
          className={cn(
            "h-4 w-4 transition-transform duration-300 ease-in-out",
            isDark ? "text-sky-400" : "text-amber-500",
          )}
        />
      </Button>
    </TooltipWrapper>
  );
}

// Simple toggle version for compact spaces
export function ThemeToggle() {
  return <ThemeSwitcher />;
}

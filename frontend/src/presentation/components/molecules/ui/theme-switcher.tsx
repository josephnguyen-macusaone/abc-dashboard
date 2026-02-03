'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/atoms/primitives/tooltip';
import { useTheme } from '@/presentation/hooks/use-theme';

export function ThemeSwitcher() {
  const { toggleTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tooltipText = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative h-9 w-9 overflow-visible"
          aria-label={tooltipText}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-300 ease-in-out dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-90 scale-0 transition-transform duration-300 ease-in-out dark:rotate-0 dark:scale-100" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}

// Simple toggle version for compact spaces
export function ThemeToggle() {
  return <ThemeSwitcher />;
}

'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { useTheme } from '@/presentation/contexts/theme-context';
import { THEMES } from '@/shared/constants';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// Simple toggle version for compact spaces
export function ThemeToggle() {
  return <ThemeSwitcher />;
}

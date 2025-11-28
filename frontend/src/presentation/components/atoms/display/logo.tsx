'use client';

import { cn } from '@/shared/utils';
import Image from 'next/image';
import LogoDark from '@assets/svgs/common/logo_dark.svg';
import LogoLight from '@assets/svgs/common/logo_light.svg';

export type LogoVariant = 'dark' | 'light' | 'text';

export interface LogoProps {
  variant?: LogoVariant;
  width?: number;
  height?: number;
  className?: string;
  // Legacy props for text variant
  iconText?: string;
  primaryText?: string;
  secondaryText?: string;
}

export function Logo({
  variant = 'dark',
  width = 160,
  height = 64,
  className,
  iconText = 'RP',
  primaryText = 'ABC',
  secondaryText = 'Dashboard',
}: LogoProps) {
  // SVG logo variant
  if (variant === 'dark' || variant === 'light') {
    const logoSrc = variant === 'dark' ? LogoDark : LogoLight;

    return (
      <div className={cn('flex justify-center', className)}>
        <Image
          src={logoSrc}
          alt="Logo"
          width={width}
          height={height}
          priority
        />
      </div>
    );
  }

  // Text-based logo variant (legacy)
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {/* Logo icon */}
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">{iconText}</span>
      </div>
      {/* Brand name */}
      <div className="mb-1 space-y-1">
        <h1 className="text-md font-bold text-foreground">{primaryText}</h1>
        <p className="text-xs text-muted-foreground -mt-1">{secondaryText}</p>
      </div>
    </div>
  );
}


'use client';

import { cn } from '@/shared/utils';
import Image from 'next/image';
import { Typography } from '@/presentation/components/atoms';
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
      <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center">
        <Typography variant="label-s" weight="bold" color="primary">
          {iconText}
        </Typography>
      </div>
      {/* Brand name */}
      <div className="mb-1 space-y-1">
        <Typography variant="title-s" weight="bold">
          {primaryText}
        </Typography>
        <Typography variant="body-xs" color="muted" className="-mt-1">
          {secondaryText}
        </Typography>
      </div>
    </div>
  );
}


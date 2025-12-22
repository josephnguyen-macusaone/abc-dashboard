'use client';

import { cn, getResponsiveSizes } from '@/shared/helpers';
import Image from 'next/image';
import LogoDark from '@assets/svgs/common/logo_dark.svg';
import LogoLight from '@assets/svgs/common/logo_light.svg';

export type LogoVariant = 'dark' | 'light';

export interface LogoProps {
  variant?: LogoVariant;
  width?: number;
  className?: string;
}

export function Logo({
  variant = 'dark',
  width = 160,
  className,
}: LogoProps) {
    const logoSrc = variant === 'dark' ? LogoDark : LogoLight;

    return (
      <div className={cn('flex justify-center', className)}>
        <Image
          src={logoSrc}
          alt="ABC Logo"
          width={width}
          sizes={getResponsiveSizes({
            mobile: Math.min(width, 120),
            tablet: Math.min(width, 140),
            desktop: width,
          })}
        priority
        quality={95}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjY0IiB2aWV3Qm94PSIwIDAgMTYwIDY0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4K"
        style={{ height: 'auto' }}
      />
    </div>
  );
}


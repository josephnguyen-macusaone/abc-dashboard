import { cn } from '@/shared/helpers';
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
        height={Math.round((width * 112) / 264)}
        priority
        unoptimized
        style={{ height: 'auto' }}
      />
    </div>
  );
}


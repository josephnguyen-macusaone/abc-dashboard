'use client';

import type * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/presentation/components/atoms/primitives/tooltip';
import { cn } from '@/shared/helpers';

export interface TooltipWrapperProps {
  /** Element that triggers the tooltip (wrapped with asChild). */
  children: React.ReactElement;
  /** Tooltip content (string or custom JSX). */
  content: React.ReactNode;
  /** Placement relative to trigger. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Delay in ms before tooltip shows (e.g. for "hover long" behavior). */
  delayDuration?: number;
  /** Distance in px from trigger. */
  sideOffset?: number;
  /** Additional class for the tooltip content container. */
  contentClassName?: string;
}

/**
 * Molecule: composes Tooltip + TooltipTrigger + TooltipContent atoms.
 * Use for the common pattern of wrapping a trigger and showing content on hover.
 * For full control (e.g. custom content layout), use the atoms from primitives/tooltip.
 */
export function TooltipWrapper({
  children,
  content,
  side = 'bottom',
  delayDuration = 0,
  sideOffset = 0,
  contentClassName,
}: TooltipWrapperProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={sideOffset}
        className={cn(contentClassName)}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

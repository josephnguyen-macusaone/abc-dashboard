"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import Image from "next/image"

import { cn, generateBlurPlaceholder } from "@/shared/helpers"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, alt, ...props }, ref) => {
  // Use Next.js Image for external URLs, Radix for data URLs
  const isExternalImage = typeof src === 'string' && (src.startsWith('http') || src.startsWith('//'));

  if (isExternalImage) {
    return (
      <div className={cn("aspect-square h-full w-full relative overflow-hidden rounded-full", className)}>
        <Image
          src={src}
          alt={alt || ''}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 40px, (max-width: 1200px) 64px, 128px"
          placeholder="blur"
          blurDataURL={generateBlurPlaceholder(40, 40)}
        />
      </div>
    );
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={src}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

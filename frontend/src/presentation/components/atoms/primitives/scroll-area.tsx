import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/shared/utils"

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  children: React.ReactNode
}

function ScrollBar({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      className={cn(
        "flex touch-none select-none transition-colors",
        "p-0.5",
        "bg-transparent",
        "hover:bg-muted/60",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2",
        "data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-muted-foreground/30"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="h-full w-full rounded-[inherit]"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.ScrollAreaCorner />
    </ScrollAreaPrimitive.Root>
  )
}

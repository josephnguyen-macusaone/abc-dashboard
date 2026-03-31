import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

import { cn } from "@/shared/helpers";

function composeRefs<T>(...refs: (React.Ref<T> | undefined | null)[]) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  children: React.ReactNode;
  /** Ref to the Radix viewport (the element that scrolls). Use with virtualizers / scroll metrics. */
  viewportRef?: React.Ref<HTMLDivElement>;
  viewportClassName?: string;
  viewportProps?: Omit<
    React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>,
    "children" | "className" | "ref"
  > & { ref?: React.Ref<HTMLDivElement> };
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
  );
}

export function ScrollArea({
  className,
  children,
  viewportRef,
  viewportClassName,
  viewportProps,
  ...props
}: ScrollAreaProps) {
  const { ref: viewportPropsRef, ...restViewport } = viewportProps ?? {};

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        ref={composeRefs(viewportRef, viewportPropsRef)}
        className={cn(
          "h-full w-full rounded-[inherit] outline-none",
          "[&>div]:!block",
          viewportClassName,
        )}
        {...restViewport}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.ScrollAreaCorner />
    </ScrollAreaPrimitive.Root>
  );
}

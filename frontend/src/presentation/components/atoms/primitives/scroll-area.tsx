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
  /**
   * Which axes get Radix scrollbars. Use `vertical` on page shells (e.g. dashboard main) so wide
   * data grids scroll inside their own ScrollArea — otherwise the shell picks up horizontal scroll
   * and shows the native-looking bar.
   */
  scrollbars?: "both" | "vertical" | "horizontal";
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
        "p-px",
        "bg-transparent",
        "hover:bg-muted/60",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
        "data-[orientation=horizontal]:h-[3px] data-[orientation=horizontal]:min-h-[3px] data-[orientation=horizontal]:w-full data-[orientation=horizontal]:p-0",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-muted-foreground/35 hover:bg-muted-foreground/50"
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
  scrollbars = "both",
  ...props
}: ScrollAreaProps) {
  const { ref: viewportPropsRef, ...restViewport } = viewportProps ?? {};
  const showVertical = scrollbars === "both" || scrollbars === "vertical";
  const showHorizontal = scrollbars === "both" || scrollbars === "horizontal";

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
          "h-full w-full min-h-0 min-w-0 rounded-[inherit] outline-none",
          /* Radix injects inline CSS to hide native bars; duplicate via stylesheet for CSP / reliability */
          "[scrollbar-width:none] [-ms-overflow-style:none]",
          "[&>div]:!block",
          viewportClassName,
        )}
        {...restViewport}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {showVertical ? <ScrollBar /> : null}
      {showHorizontal ? <ScrollBar orientation="horizontal" /> : null}
      {showVertical && showHorizontal ? (
        <ScrollAreaPrimitive.ScrollAreaCorner className="bg-border" />
      ) : null}
    </ScrollAreaPrimitive.Root>
  );
}

export { ScrollBar };

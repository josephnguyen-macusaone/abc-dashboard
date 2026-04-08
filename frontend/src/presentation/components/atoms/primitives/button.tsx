import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/helpers"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive [&>:not(svg)]:px-0.5 [&>:not(svg)]:leading-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        /** User form footer Save — brand primary (orange), 12px radius */
        orderPrimary:
          "rounded-xl border-2 border-primary bg-primary font-bold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/40",
        /** ABC Order PMS input field (Figma 4410:37031) — neutral border, filled surface, 12px type bold */
        orderCancel:
          "rounded-xl border border-border bg-card font-bold text-foreground shadow-none hover:bg-muted/60 active:bg-muted/80 dark:border-[#404040] dark:bg-[#1b1b1b] dark:text-[#f5f5f5] dark:hover:bg-[#262626] dark:active:bg-[#2e2e2e] focus-visible:ring-ring/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // MAC USA ONE Typography: Button sizes with generous padding for better UX
        xs: "h-8 px-3.5 py-2 has-[>svg]:px-2.5 text-button-s",
        default: "h-9 px-5 py-2.5 has-[>svg]:px-3.5 text-button-m",
        md: "h-10 px-6 py-3 has-[>svg]:px-4.5 text-button-m",
        sm: "h-8 rounded-md gap-2 px-4 has-[>svg]:px-3 text-button-s",
        lg: "h-11 rounded-md px-9 has-[>svg]:px-7 text-button-l",
        xl: "h-12 rounded-md px-11 has-[>svg]:px-9 text-button-l",
        /** User form footer row — 12px type with comfortable vertical padding */
        order: "min-h-10 rounded-xl px-6 py-2 text-[12px] leading-3 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-md": "size-10",
        "icon-lg": "size-11",
        "icon-xl": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

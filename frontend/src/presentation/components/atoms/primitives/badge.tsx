import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/helpers"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        admin:
          "border-transparent bg-purple-600 text-white hover:bg-purple-700 shadow-sm",
        manager:
          "border-transparent bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        staff:
          "border-transparent bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
        active:
          "border-transparent bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
        inactive:
          "border-transparent bg-slate-500 text-white hover:bg-slate-600 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
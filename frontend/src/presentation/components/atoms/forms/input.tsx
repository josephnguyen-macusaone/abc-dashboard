import * as React from "react"

import { cn } from "@/shared/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // MAC USA ONE Typography: Body S for input text
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-4 py-3 text-body-s shadow-xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-label-s disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Enhanced focus states without rings
        "focus-visible:border-primary focus-visible:bg-background focus-visible:shadow-sm",
        // Error states without rings
        "aria-invalid:border-destructive aria-invalid:bg-destructive/5",
        className
      )}
      {...props}
    />
  )
}

export { Input }

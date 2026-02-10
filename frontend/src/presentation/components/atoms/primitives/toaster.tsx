'use client';

import { Toaster as Sonner } from "sonner"
import React from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-sm",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90 group-[.toast]:transition-colors",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 group-[.toast]:transition-colors",
          closeButton:
            "group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:transition-colors",
          error:
            "!bg-gradient-to-r !from-red-500 !to-red-600 !text-white !border-red-500/20 dark:!from-red-600 dark:!to-red-700 dark:!border-red-600/20 !shadow-red-500/10",
          success:
            "!bg-gradient-to-r !from-emerald-500 !to-emerald-600 !text-white !border-emerald-500/20 dark:!from-emerald-600 dark:!to-emerald-700 dark:!border-emerald-600/20 !shadow-emerald-500/10",
          warning:
            "!bg-gradient-to-r !from-amber-500 !to-orange-500 !text-white !border-amber-500/20 dark:!from-amber-600 dark:!to-orange-600 dark:!border-amber-600/20 !shadow-amber-500/10",
          info:
            "!bg-gradient-to-r !from-blue-500 !to-indigo-500 !text-white !border-blue-500/20 dark:!from-blue-600 dark:!to-indigo-600 dark:!border-blue-600/20 !shadow-blue-500/10",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
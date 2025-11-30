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
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error:
            "!bg-red-500 !text-white !border-red-600 dark:!bg-red-600 dark:!text-white dark:!border-red-700",
          success:
            "!bg-green-500 !text-white !border-green-600 dark:!bg-green-600 dark:!text-white dark:!border-green-700",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
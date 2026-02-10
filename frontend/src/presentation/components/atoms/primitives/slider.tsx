"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/shared/helpers"

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  singleThumbDefault?: boolean
  thumbLabels?: string[]
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  singleThumbDefault = false,
  thumbLabels,
  ...props
}: SliderProps) {
  const trackValues = value ?? defaultValue
  const thumbCount = Array.isArray(trackValues)
    ? trackValues.length
    : singleThumbDefault
      ? 1
      : 2
  const resolvedThumbLabels =
    thumbLabels && thumbLabels.length > 0
      ? thumbLabels
      : Array.from({ length: thumbCount }, (_, index) =>
        thumbCount === 1 ? 'Value' : `Value ${index + 1}`
      )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-primary"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={resolvedThumbLabels[index]}
          className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }


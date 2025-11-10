import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      {...props}
      className={cn(
        `
        flex w-full
        h-10 px-3 py-2
        text-sm font-medium
        rounded-md
        border
        bg-[hsl(var(--color-background)/0.4)]
        border-[hsl(var(--color-border)/0.5)]
        text-[hsl(var(--color-foreground))]
        placeholder:text-[hsl(var(--color-muted-foreground)/0.8)]
        backdrop-blur-sm
        shadow-[0_1px_4px_hsl(var(--color-border)/0.25)]
        transition-all duration-200

        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[hsl(var(--color-ring))]
        focus-visible:ring-offset-1
        focus-visible:ring-offset-[hsl(var(--color-background))]
        focus-visible:shadow-[0_2px_8px_hsl(var(--color-ring)/0.4)]

        hover:border-[hsl(var(--color-primary)/0.4)]
        hover:shadow-[0_1px_6px_hsl(var(--color-border)/0.3)]

        disabled:cursor-not-allowed
        disabled:opacity-60
        file:border-0 file:bg-transparent file:text-sm file:font-medium
        `,
        className
      )}
    />
  )
})
Input.displayName = "Input"

export { Input }
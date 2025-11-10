import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const getVariantStyles = () => {
      switch (variant) {
        case "destructive":
          return {
            backgroundColor: "hsl(var(--color-destructive) / 0.9)",
            color: "hsl(var(--color-destructive-foreground))",
            borderColor: "hsl(var(--color-destructive) / 0.4)",
          }
        case "outline":
          return {
            backgroundColor: "hsl(var(--color-background) / 0.4)",
            borderColor: "hsl(var(--color-border))",
            borderWidth: "1px",
            color: "hsl(var(--color-foreground))",
          }
        case "secondary":
          return {
            backgroundColor: "hsl(var(--color-secondary) / 0.3)",
            color: "hsl(var(--color-secondary-foreground))",
            borderColor: "hsl(var(--color-secondary) / 0.4)",
          }
        case "ghost":
          return {
            backgroundColor: "transparent",
            color: "hsl(var(--color-foreground))",
          }
        case "link":
          return {
            backgroundColor: "transparent",
            color: "hsl(var(--color-primary))",
            textDecoration: "underline",
          }
        default:
          return {
            backgroundColor: "hsl(var(--color-primary) / 0.9)",
            color: "hsl(var(--color-primary-foreground))",
            borderColor: "hsl(var(--color-primary) / 0.4)",
          }
      }
    }

    const getSizeClasses = () => {
      switch (size) {
        case "sm":
          return "h-9 rounded-md px-3 text-sm"
        case "lg":
          return "h-11 rounded-lg px-8 text-base"
        case "icon":
          return "h-10 w-10 p-0"
        default:
          return "h-10 px-4 py-2 text-sm"
      }
    }

    return (
      <button
        ref={ref}
        {...props}
        className={cn(
          `
          inline-flex items-center justify-center
          whitespace-nowrap rounded-md font-medium
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-ring))]
          disabled:pointer-events-none disabled:opacity-50
          backdrop-blur-sm border
          shadow-[0_2px_6px_hsl(var(--color-border)/0.3)]
          hover:scale-[1.03] hover:brightness-110 active:scale-[0.97]
          `,
          getSizeClasses(),
          className
        )}
        style={getVariantStyles()}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
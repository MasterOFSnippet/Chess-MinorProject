import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: "hsl(var(--color-secondary) / 0.25)",
          color: "hsl(var(--color-secondary-foreground))",
          borderColor: "hsl(var(--color-secondary) / 0.4)",
        }
      case "destructive":
        return {
          backgroundColor: "hsl(var(--color-destructive) / 0.25)",
          color: "hsl(var(--color-destructive-foreground))",
          borderColor: "hsl(var(--color-destructive) / 0.4)",
        }
      case "outline":
        return {
          backgroundColor: "transparent",
          color: "hsl(var(--color-foreground))",
          borderColor: "hsl(var(--color-border))",
        }
      default:
        return {
          backgroundColor: "hsl(var(--color-primary) / 0.25)",
          color: "hsl(var(--color-primary-foreground))",
          borderColor: "hsl(var(--color-primary) / 0.4)",
        }
    }
  }

  return (
    <div
      className={cn(
        `
        inline-flex items-center justify-center
        rounded-full border
        px-2.5 py-0.5 text-xs font-semibold
        backdrop-blur-sm
        transition-all duration-200
        hover:scale-[1.05] hover:brightness-110
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-ring))]
        shadow-[0_1px_4px_hsl(var(--color-border)/0.3)]
        `,
        className
      )}
      style={getVariantStyles()}
      {...props}
    />
  )
}

export { Badge }
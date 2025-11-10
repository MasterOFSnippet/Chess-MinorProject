import * as React from "react"
import { cn } from "../../lib/utils"

// 🌌 Base Card
const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      `
      relative
      rounded-xl border
      backdrop-blur-sm
      shadow-[0_4px_20px_hsl(var(--color-border)/0.15)]
      transition-all duration-300
      hover:shadow-[0_6px_24px_hsl(var(--color-border)/0.25)]
      hover:scale-[1.01]
      `,
      className
    )}
    style={{
      backgroundColor: "hsl(var(--color-card) / 0.6)",
      color: "hsl(var(--color-card-foreground))",
      borderColor: "hsl(var(--color-border) / 0.5)",
    }}
    {...props}
  />
))
Card.displayName = "Card"

// 🧭 Header
const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      `
      flex flex-col space-y-1.5 p-6
      border-b border-[hsl(var(--color-border)/0.4)]
      backdrop-blur-[2px]
      `,
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// 🏷️ Title
const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      `
      text-2xl font-semibold tracking-tight leading-tight
      text-[hsl(var(--color-foreground))]
      `,
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

// 📜 Description
const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm leading-relaxed", className)}
    style={{
      color: "hsl(var(--color-muted-foreground))",
    }}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// 💬 Content
const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-4 flex flex-col gap-3", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

// ⚡ Footer
const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      `
      flex items-center justify-end
      p-6 pt-0
      border-t border-[hsl(var(--color-border)/0.4)]
      backdrop-blur-[2px]
      `,
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}
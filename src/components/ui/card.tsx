import * as React from "react"
import { cn } from "../../lib/utils"

const _Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "glass-card",
      className
    )}
    {...props}
  />
))
_Card.displayName = "Card"

const _CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
_CardHeader.displayName = "CardHeader"

const _CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    style={{ color: 'var(--text-primary)', ...props.style } as React.CSSProperties}
    {...props}
  />
))
_CardTitle.displayName = "CardTitle"

const _CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm", className)}
    style={{ color: 'var(--text-secondary)', ...props.style } as React.CSSProperties}
    {...props}
  />
))
_CardDescription.displayName = "CardDescription"

const _CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
_CardContent.displayName = "CardContent"

const _CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
_CardFooter.displayName = "CardFooter"

export { 
  _Card as Card, 
  _CardHeader as CardHeader, 
  _CardFooter as CardFooter, 
  _CardTitle as CardTitle, 
  _CardDescription as CardDescription, 
  _CardContent as CardContent 
}
import * as React from "react"
import { cn } from "../../lib/utils"

const _GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl transition-all duration-300 hover:bg-white/15 hover:border-white/30",
      className
    )}
    {...props}
  />
))
GlassCard.displayName = "GlassCard"

const _GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 border-b border-white/10", className)}
    {...props}
  />
))
GlassCardHeader.displayName = "GlassCardHeader"

const _GlassCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight text-shadow-strong",
      className
    )}
    style={{color: 'var(--text-primary)'}}
    {...props}
  />
))
GlassCardTitle.displayName = "GlassCardTitle"

const _GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-shadow-normal", className)}
    style={{color: 'var(--text-secondary)'}}
    {...props}
  />
))
GlassCardDescription.displayName = "GlassCardDescription"

const _GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
))
GlassCardContent.displayName = "GlassCardContent"

const _GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 border-t border-white/10", className)}
    {...props}
  />
))
GlassCardFooter.displayName = "GlassCardFooter"

export { 
  GlassCard, 
  GlassCardHeader, 
  GlassCardFooter, 
  GlassCardTitle, 
  GlassCardDescription, 
  GlassCardContent 
}
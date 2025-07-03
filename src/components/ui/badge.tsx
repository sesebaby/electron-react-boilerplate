import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-white/20 text-white backdrop-blur-sm",
        secondary:
          "border-transparent bg-blue-500/20 text-blue-100 backdrop-blur-sm",
        destructive:
          "border-transparent bg-red-500/20 text-red-100 backdrop-blur-sm",
        outline: "text-white border-white/30",
        success:
          "border-transparent bg-green-500/20 text-green-100 backdrop-blur-sm",
        warning:
          "border-transparent bg-yellow-500/20 text-yellow-100 backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
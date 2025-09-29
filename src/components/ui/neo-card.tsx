import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const neoCardVariants = cva(
  "rounded-lg transition-all duration-220",
  {
    variants: {
      variant: {
        default: "glass-card",
        elevated: "glass-card-elevated",
        neon: "glass-card-neon",
        solid: "bg-card border border-border",
        ghost: "bg-transparent border-0",
      },
      size: {
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
        xl: "p-8",
      },
      glow: {
        none: "",
        subtle: "shadow-card",
        medium: "shadow-elevated",
        strong: "shadow-neon",
      },
      interactive: {
        none: "",
        hover: "hover:scale-[1.02] hover:shadow-elevated cursor-pointer",
        press: "ripple hover:scale-[1.02] active:scale-[0.98]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      glow: "subtle",
      interactive: "none",
    },
  }
)

export interface NeoCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof neoCardVariants> {}

const NeoCard = React.forwardRef<HTMLDivElement, NeoCardProps>(
  ({ className, variant, size, glow, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(neoCardVariants({ variant, size, glow, interactive, className }))}
      {...props}
    />
  )
)
NeoCard.displayName = "NeoCard"

const NeoCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
))
NeoCardHeader.displayName = "NeoCardHeader"

const NeoCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-heading text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
NeoCardTitle.displayName = "NeoCardTitle"

const NeoCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
NeoCardDescription.displayName = "NeoCardDescription"

const NeoCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
))
NeoCardContent.displayName = "NeoCardContent"

const NeoCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
))
NeoCardFooter.displayName = "NeoCardFooter"

export {
  NeoCard,
  NeoCardHeader,
  NeoCardTitle,
  NeoCardDescription,
  NeoCardContent,
  NeoCardFooter,
}
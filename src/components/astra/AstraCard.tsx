import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const astraCardVariants = cva(
  "rounded-lg transition-all duration-standard border",
  {
    variants: {
      variant: {
        default: "bg-card-primary border-border-subtle",
        elevated: "bg-card-glass backdrop-blur-xl border-border-subtle shadow-card",
        glass: "bg-card-glass backdrop-blur-xl border-border-subtle/50",
        neon: "bg-card-glass backdrop-blur-xl border-accent/30 shadow-neon",
        solid: "bg-card-primary border-border-default",
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
        press: "hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      glow: "none",
      interactive: "none",
    },
  }
)

export interface AstraCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof astraCardVariants> {}

const AstraCard = React.forwardRef<HTMLDivElement, AstraCardProps>(
  ({ className, variant, size, glow, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(astraCardVariants({ variant, size, glow, interactive, className }))}
      {...props}
    />
  )
)
AstraCard.displayName = "AstraCard"

const AstraCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
))
AstraCardHeader.displayName = "AstraCardHeader"

const AstraCardTitle = React.forwardRef<
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
AstraCardTitle.displayName = "AstraCardTitle"

const AstraCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
))
AstraCardDescription.displayName = "AstraCardDescription"

const AstraCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
))
AstraCardContent.displayName = "AstraCardContent"

const AstraCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
))
AstraCardFooter.displayName = "AstraCardFooter"

export {
  AstraCard,
  AstraCardHeader,
  AstraCardTitle,
  AstraCardDescription,
  AstraCardContent,
  AstraCardFooter,
}
import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const glassCardVariants = cva(
  "glass-card rounded-lg border shadow-card transition-all duration-normal",
  {
    variants: {
      variant: {
        default: "bg-card-glass text-card-foreground",
        primary: "bg-gradient-primary text-primary-foreground border-primary/30",
        accent: "bg-gradient-to-br from-accent/20 to-primary/20 text-foreground border-accent/30",
        muted: "bg-muted/50 text-muted-foreground border-muted/30",
        destructive: "bg-gradient-to-br from-destructive/20 to-destructive/10 text-destructive-foreground border-destructive/30"
      },
      hover: {
        none: "",
        glow: "glow-hover cursor-pointer",
        scale: "hover:scale-105 transition-transform duration-normal cursor-pointer"
      },
      blur: {
        sm: "backdrop-blur-sm",
        md: "backdrop-blur-md", 
        lg: "backdrop-blur-lg",
        xl: "backdrop-blur-xl"
      }
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
      blur: "lg"
    }
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, hover, blur, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(glassCardVariants({ variant, hover, blur }), className)}
      {...props}
    />
  )
);
GlassCard.displayName = "GlassCard";

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
GlassCardHeader.displayName = "GlassCardHeader";

const GlassCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
GlassCardTitle.displayName = "GlassCardTitle";

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
GlassCardDescription.displayName = "GlassCardDescription";

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent";

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
GlassCardFooter.displayName = "GlassCardFooter";

export {
  GlassCard,
  GlassCardHeader,
  GlassCardFooter,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
};
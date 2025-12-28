import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CleanCardProps {
  children: ReactNode;
  variant?: "default" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export function CleanCard({ 
  children, 
  variant = "default", 
  padding = "md",
  className,
  onClick 
}: CleanCardProps) {
  const paddingClasses = {
    none: "p-0",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const variantClasses = {
    default: "bg-card/90 dark:bg-[hsl(220_13%_7%)] border-border/40",
    elevated: "bg-card dark:bg-[hsl(220_13%_10%)] border-border/40 shadow-lg",
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors duration-200",
        variantClasses[variant],
        paddingClasses[padding],
        onClick && "cursor-pointer hover:bg-[hsl(220_13%_12%)]",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

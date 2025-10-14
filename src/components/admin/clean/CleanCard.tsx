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
    default: "bg-[hsl(220_13%_7%)] border-[hsl(220_13%_14%/0.4)]",
    elevated: "bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] shadow-[0_4px_6px_-1px_rgb(0_0_0/0.1)]",
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

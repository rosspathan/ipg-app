import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(({ className, children, size = "md", ...props }, ref) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-fab h-fab",
    lg: "w-20 h-20"
  };

  return (
    <Button
      ref={ref}
      className={cn(
        "fab rounded-full border-0 text-primary-foreground shadow-fab",
        "bg-gradient-primary hover:bg-gradient-primary",
        "transition-all duration-normal ease-out",
        "hover:shadow-neon hover:-translate-y-1 hover:scale-105",
        "active:scale-95 active:translate-y-0",
        "relative overflow-hidden",
        "before:absolute before:inset-0 before:rounded-full",
        "before:bg-gradient-neon before:opacity-0 before:transition-opacity before:duration-fast",
        "hover:before:opacity-30",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </Button>
  );
});

FloatingActionButton.displayName = "FloatingActionButton";

export { FloatingActionButton };
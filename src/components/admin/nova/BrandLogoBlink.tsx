import * as React from "react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface BrandLogoBlinkProps {
  className?: string;
}

/**
 * BrandLogoBlink - Animated circular logo with subtle blink
 * - Blinks every ~6 seconds (1s highlight)
 * - Tap opens About modal
 * - Respects prefers-reduced-motion
 */
export function BrandLogoBlink({ className }: BrandLogoBlinkProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const prefersReducedMotion = 
    typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 1000);
    }, 6000);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <>
      <button
        data-testid="admin-logo"
        onClick={() => setShowAbout(true)}
        className={cn(
          "relative w-12 h-12 rounded-full overflow-hidden",
          "transition-transform duration-[120ms]",
          "hover:scale-105 active:scale-95",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
          className
        )}
      >
        {/* Glow effect during blink */}
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-opacity duration-500",
            "bg-gradient-to-br from-primary to-secondary",
            isBlinking ? "opacity-40 blur-md" : "opacity-0"
          )}
          style={{
            filter: isBlinking ? "blur(12px)" : "none",
          }}
        />
        
        {/* Logo container */}
        <div
          className={cn(
            "relative w-full h-full rounded-full",
            "bg-gradient-to-br from-primary/20 to-secondary/20",
            "border border-primary/30",
            "flex items-center justify-center",
            "backdrop-blur-xl",
            "transition-all duration-300",
            isBlinking && "border-primary shadow-[0_0_24px_-6px_hsl(262_100%_65%/0.6)]"
          )}
        >
          {/* IPG Logo Text */}
          <span className="text-sm font-bold text-white tracking-wider">
            IPG
          </span>
        </div>

        {/* Pulse ring during blink */}
        {isBlinking && !prefersReducedMotion && (
          <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
        )}
      </button>

      {/* About Modal */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold">
              About IPG Admin Console
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="text-foreground font-medium mb-1">Nova Admin DS</p>
              <p>Mobile-first admin console built with the Nova design system.</p>
            </div>
            
            <div>
              <p className="text-foreground font-medium mb-1">Version</p>
              <p>1.0.0 • Admin Console</p>
            </div>
            
            <div>
              <p className="text-foreground font-medium mb-1">Design Principles</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Mobile-first, responsive up to desktop</li>
                <li>High-contrast dark theme</li>
                <li>60fps animations with reduced-motion support</li>
                <li>AA accessibility compliance</li>
              </ul>
            </div>
            
            <div className="pt-2 border-t border-border">
              <p className="text-xs">
                © 2025 IPG I-SMART Platform • Admin Console
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

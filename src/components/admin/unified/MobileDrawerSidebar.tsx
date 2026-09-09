import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminSidebarUnified } from "./AdminSidebarUnified";

interface MobileDrawerSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawerSidebar({ open, onClose }: MobileDrawerSidebarProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed left-0 top-0 z-[70] h-screen w-[280px] max-w-[calc(100vw-2rem)] lg:hidden shadow-2xl shadow-black/60",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-9 w-9 flex items-center justify-center rounded-lg text-[hsl(240_10%_55%)] hover:text-[hsl(0_0%_95%)] hover:bg-[hsl(235_28%_18%)] transition-colors"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <AdminSidebarUnified onNavigate={onClose} className="h-full" />
      </div>
    </>
  );
}

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatusBadgeProps {
  status: "success" | "warning" | "danger" | "info" | "default";
  label: string;
  className?: string;
  animated?: boolean;
}

const statusStyles = {
  success: {
    bg: "hsl(152 64% 48% / 0.1)",
    text: "hsl(152 64% 48%)",
    border: "hsl(152 64% 48% / 0.3)",
    glow: "hsl(152 64% 48% / 0.3)"
  },
  warning: {
    bg: "hsl(33 93% 60% / 0.1)",
    text: "hsl(33 93% 60%)",
    border: "hsl(33 93% 60% / 0.3)",
    glow: "hsl(33 93% 60% / 0.3)"
  },
  danger: {
    bg: "hsl(0 84% 60% / 0.1)",
    text: "hsl(0 84% 60%)",
    border: "hsl(0 84% 60% / 0.3)",
    glow: "hsl(0 84% 60% / 0.3)"
  },
  info: {
    bg: "hsl(217 91% 60% / 0.1)",
    text: "hsl(217 91% 60%)",
    border: "hsl(217 91% 60% / 0.3)",
    glow: "hsl(217 91% 60% / 0.3)"
  },
  default: {
    bg: "hsl(220 13% 14% / 0.4)",
    text: "hsl(220 9% 65%)",
    border: "hsl(220 13% 14%)",
    glow: "hsl(220 13% 14% / 0.3)"
  }
};

export function StatusBadge({ status, label, className, animated = false }: StatusBadgeProps) {
  const style = statusStyles[status];
  
  const BadgeComponent = animated ? motion.span : 'span';
  const animationProps = animated ? {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.2 }
  } : {};

  return (
    <BadgeComponent
      {...animationProps}
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
        className
      )}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
        boxShadow: status !== 'default' ? `0 0 12px ${style.glow}` : 'none'
      }}
    >
      {label}
    </BadgeComponent>
  );
}

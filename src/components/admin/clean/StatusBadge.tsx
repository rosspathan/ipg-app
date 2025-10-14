import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "success" | "warning" | "danger" | "info" | "default";
  label: string;
  className?: string;
}

const statusStyles = {
  success: "bg-[hsl(152_64%_48%/0.1)] text-[hsl(152_64%_48%)] border-[hsl(152_64%_48%/0.2)]",
  warning: "bg-[hsl(33_93%_60%/0.1)] text-[hsl(33_93%_60%)] border-[hsl(33_93%_60%/0.2)]",
  danger: "bg-[hsl(0_84%_60%/0.1)] text-[hsl(0_84%_60%)] border-[hsl(0_84%_60%/0.2)]",
  info: "bg-[hsl(217_91%_60%/0.1)] text-[hsl(217_91%_60%)] border-[hsl(217_91%_60%/0.2)]",
  default: "bg-[hsl(220_13%_14%/0.4)] text-[hsl(220_9%_65%)] border-[hsl(220_13%_14%)]",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
        statusStyles[status],
        className
      )}
    >
      {label}
    </span>
  );
}

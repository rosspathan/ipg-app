import { cn } from "@/lib/utils";

interface ProgramStatusBadgeProps {
  status: string;
}

export function ProgramStatusBadge({ status }: ProgramStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "published":
        return {
          label: "Live",
          icon: "🟢",
          className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        };
      case "draft":
        return {
          label: "Draft",
          icon: "🟡",
          className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
        };
      case "archived":
        return {
          label: "Paused",
          icon: "🔴",
          className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        };
      default:
        return {
          label: status,
          icon: "⚪",
          className: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </div>
  );
}

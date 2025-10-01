import * as React from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecordCardField {
  label: string;
  value: string | number;
  variant?: "default" | "muted" | "primary" | "accent";
}

interface RecordCardAction {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface RecordCardProps {
  id: string;
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    variant: "default" | "success" | "warning" | "danger" | "primary";
  };
  fields: RecordCardField[];
  actions?: RecordCardAction[];
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

/**
 * RecordCard - Mobile card view of a record
 * - Status badge
 * - Key fields
 * - Overflow menu for actions
 * - Tap to open DetailSheet
 */
export function RecordCard({
  id,
  title,
  subtitle,
  status,
  fields,
  actions = [],
  onClick,
  selected = false,
  className,
}: RecordCardProps) {
  const statusVariantMap = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success border border-success/20",
    warning: "bg-warning/10 text-warning border border-warning/20",
    danger: "bg-danger/10 text-danger border border-danger/20",
    primary: "bg-primary/10 text-primary border border-primary/20",
  };

  return (
    <div
      data-testid="record-card"
      data-record-id={id}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-2xl",
        "bg-[hsl(229_30%_16%/0.5)] backdrop-blur border border-[hsl(225_24%_22%/0.16)]",
        "transition-all duration-[120ms]",
        "hover:bg-[hsl(229_30%_16%)] hover:border-primary/30",
        selected && "border-primary bg-[hsl(229_30%_16%)] shadow-[0_0_24px_-6px_hsl(262_100%_65%/0.3)]",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-foreground truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-2 py-0.5",
                statusVariantMap[status.variant]
              )}
            >
              {status.label}
            </Badge>
          )}

          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)]">
                {actions.map((action, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                    className={cn(
                      action.variant === "destructive" && "text-danger focus:text-danger"
                    )}
                  >
                    {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field, idx) => (
          <div key={idx} className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{field.label}</p>
            <p
              className={cn(
                "text-sm font-medium truncate tabular-nums",
                field.variant === "muted" && "text-muted-foreground",
                field.variant === "primary" && "text-primary",
                field.variant === "accent" && "text-accent",
                !field.variant && "text-foreground"
              )}
            >
              {field.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export interface FormField {
  id: string;
  type: "text" | "number" | "email" | "textarea" | "select" | "switch" | "checkbox";
  label: string;
  placeholder?: string;
  value: any;
  onChange: (value: any) => void;
  options?: { label: string; value: any }[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
  description?: string;
  span?: 1 | 2; // Grid column span (1 = half width, 2 = full width on tablet+)
}

interface FormKitProps {
  fields: FormField[];
  layout?: "1col" | "2col";
  changes?: Record<string, any>;
  className?: string;
}

/**
 * FormKit - Mobile-optimized forms
 * - 1-col mobile, 2-col tablet (when layout="2col")
 * - Inline validation
 * - Change summary badges
 * - Accessible form controls
 */
export function FormKit({
  fields,
  layout = "2col",
  changes = {},
  className,
}: FormKitProps) {
  const hasChanges = Object.keys(changes).length > 0;

  const renderField = (field: FormField) => {
    const hasError = !!field.error;
    const hasChange = field.id in changes;

    const baseInputClass = cn(
      "bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)]",
      "focus:border-primary focus:ring-1 focus:ring-primary",
      hasError && "border-danger focus:border-danger focus:ring-danger",
      field.disabled && "opacity-50 cursor-not-allowed"
    );

    return (
      <div
        key={field.id}
        data-testid="form-kit"
        className={cn(
          "space-y-2",
          layout === "2col" && field.span === 2 && "md:col-span-2"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-danger ml-1">*</span>}
          </Label>
          {hasChange && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0 bg-accent/10 text-accent border-accent/20"
            >
              Modified
            </Badge>
          )}
        </div>

        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}

        {field.type === "text" && (
          <Input
            id={field.id}
            type="text"
            placeholder={field.placeholder}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            disabled={field.disabled}
            className={baseInputClass}
          />
        )}

        {field.type === "number" && (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={field.value}
            onChange={(e) => field.onChange(parseFloat(e.target.value))}
            disabled={field.disabled}
            className={cn(baseInputClass, "tabular-nums")}
          />
        )}

        {field.type === "email" && (
          <Input
            id={field.id}
            type="email"
            placeholder={field.placeholder}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            disabled={field.disabled}
            className={baseInputClass}
          />
        )}

        {field.type === "textarea" && (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            disabled={field.disabled}
            rows={4}
            className={baseInputClass}
          />
        )}

        {field.type === "select" && (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={field.disabled}
          >
            <SelectTrigger id={field.id} className={baseInputClass}>
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)]">
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === "switch" && (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.id}
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={field.disabled}
            />
          </div>
        )}

        {field.type === "checkbox" && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={field.disabled}
            />
          </div>
        )}

        {field.error && (
          <p className="text-xs text-danger">{field.error}</p>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "grid gap-4",
        layout === "1col" && "grid-cols-1",
        layout === "2col" && "grid-cols-1 md:grid-cols-2",
        className
      )}
    >
      {fields.map(renderField)}
    </div>
  );
}

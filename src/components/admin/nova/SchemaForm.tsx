import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  items?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  default?: any;
  title?: string;
  description?: string;
}

interface SchemaFormProps {
  schema: JSONSchema;
  value: any;
  onChange: (value: any) => void;
  className?: string;
}

/**
 * SchemaForm - JSON Schema-driven form generator
 * Renders forms dynamically based on JSON Schema definitions
 */
export function SchemaForm({ schema, value, onChange, className }: SchemaFormProps) {
  const [formData, setFormData] = useState(value || {});

  const handleChange = (path: string[], newValue: any) => {
    const updated = { ...formData };
    let current: any = updated;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = newValue;
    setFormData(updated);
    onChange(updated);
  };

  const renderField = (
    key: string,
    fieldSchema: JSONSchema,
    path: string[] = [],
    value: any
  ) => {
    const fullPath = [...path, key];
    const fieldValue = value?.[key] ?? fieldSchema.default;

    if (fieldSchema.type === 'object' && fieldSchema.properties) {
      return (
        <div key={key} className="space-y-3 p-4 rounded-xl border border-[hsl(225_24%_22%/0.16)] bg-[hsl(229_30%_16%/0.3)]">
          <Label className="text-sm font-medium text-foreground">
            {fieldSchema.title || key}
          </Label>
          {fieldSchema.description && (
            <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
          )}
          <div className="space-y-3">
            {Object.entries(fieldSchema.properties).map(([subKey, subSchema]) =>
              renderField(subKey, subSchema as JSONSchema, fullPath, fieldValue)
            )}
          </div>
        </div>
      );
    }

    if (fieldSchema.type === 'array') {
      return (
        <ArrayField
          key={key}
          label={fieldSchema.title || key}
          description={fieldSchema.description}
          itemSchema={fieldSchema.items}
          value={fieldValue || []}
          onChange={(newValue) => handleChange(fullPath, newValue)}
        />
      );
    }

    if (fieldSchema.enum) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium text-foreground">
            {fieldSchema.title || key}
          </Label>
          {fieldSchema.description && (
            <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
          )}
          <Select
            value={String(fieldValue)}
            onValueChange={(val) => handleChange(fullPath, val)}
          >
            <SelectTrigger 
              id={key}
              className="bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(230_28%_13%)] border-[hsl(225_24%_22%)]">
              {fieldSchema.enum.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (fieldSchema.type === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between space-x-2 py-2">
          <div className="space-y-0.5">
            <Label htmlFor={key} className="text-sm font-medium text-foreground">
              {fieldSchema.title || key}
            </Label>
            {fieldSchema.description && (
              <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
            )}
          </div>
          <Switch
            id={key}
            checked={fieldValue ?? false}
            onCheckedChange={(checked) => handleChange(fullPath, checked)}
          />
        </div>
      );
    }

    if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium text-foreground">
            {fieldSchema.title || key}
          </Label>
          {fieldSchema.description && (
            <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
          )}
          <Input
            id={key}
            type="number"
            value={fieldValue ?? ''}
            onChange={(e) => handleChange(fullPath, parseFloat(e.target.value))}
            min={fieldSchema.minimum}
            max={fieldSchema.maximum}
            className="bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)] tabular-nums"
          />
        </div>
      );
    }

    // Default to text field
    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key} className="text-sm font-medium text-foreground">
          {fieldSchema.title || key}
        </Label>
        {fieldSchema.description && (
          <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
        )}
        <Input
          id={key}
          type="text"
          value={fieldValue ?? ''}
          onChange={(e) => handleChange(fullPath, e.target.value)}
          className="bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)]"
        />
      </div>
    );
  };

  return (
    <div data-testid="program-form" className={cn("space-y-4", className)}>
      {schema.properties &&
        Object.entries(schema.properties).map(([key, fieldSchema]) =>
          renderField(key, fieldSchema as JSONSchema, [], formData)
        )}
    </div>
  );
}

interface ArrayFieldProps {
  label: string;
  description?: string;
  itemSchema: JSONSchema;
  value: any[];
  onChange: (value: any[]) => void;
}

function ArrayField({ label, description, itemSchema, value, onChange }: ArrayFieldProps) {
  const addItem = () => {
    const defaultItem = getDefaultValue(itemSchema);
    onChange([...value, defaultItem]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: any) => {
    const updated = [...value];
    updated[index] = newValue;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-foreground">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={addItem}
          className="gap-2 bg-transparent border-[hsl(225_24%_22%/0.16)]"
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 rounded-xl border border-[hsl(225_24%_22%/0.16)] bg-[hsl(229_30%_16%/0.3)]"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground mt-2 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              {renderArrayItem(itemSchema, item, (newValue) => updateItem(index, newValue))}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeItem(index)}
              className="flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderArrayItem(schema: JSONSchema, value: any, onChange: (value: any) => void) {
  if (schema.type === 'object' && schema.properties) {
    return (
      <div className="space-y-2">
        {Object.entries(schema.properties).map(([key, fieldSchema]) => {
          const fs = fieldSchema as JSONSchema;
          const fieldValue = value?.[key] ?? fs.default;

          if (fs.type === 'number' || fs.type === 'integer') {
            return (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{key}</Label>
                <Input
                  type="number"
                  value={fieldValue ?? ''}
                  onChange={(e) => onChange({ ...value, [key]: parseFloat(e.target.value) })}
                  className="bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)] h-8 text-sm"
                />
              </div>
            );
          }

          return (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{key}</Label>
              <Input
                type="text"
                value={fieldValue ?? ''}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                className="bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)] h-8 text-sm"
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[hsl(229_30%_16%/0.5)] border-[hsl(225_24%_22%/0.16)] h-8 text-sm"
    />
  );
}

function getDefaultValue(schema: JSONSchema): any {
  if (schema.default !== undefined) return schema.default;
  
  if (schema.type === 'object' && schema.properties) {
    const obj: any = {};
    Object.entries(schema.properties).forEach(([key, fieldSchema]) => {
      obj[key] = getDefaultValue(fieldSchema as JSONSchema);
    });
    return obj;
  }
  
  if (schema.type === 'array') return [];
  if (schema.type === 'boolean') return false;
  if (schema.type === 'number' || schema.type === 'integer') return 0;
  return '';
}

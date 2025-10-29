import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { OrderBookMode } from "./OrderBookPro";

interface OrderBookControlsProps {
  mode: OrderBookMode;
  precision: number;
  onModeChange: (mode: OrderBookMode) => void;
  onPrecisionChange: (precision: number) => void;
}

export function OrderBookControls({
  mode,
  precision,
  onModeChange,
  onPrecisionChange,
}: OrderBookControlsProps) {
  const precisionOptions = [
    { value: 0.01, label: "0.01" },
    { value: 0.1, label: "0.1" },
    { value: 1, label: "1" },
    { value: 10, label: "10" },
    { value: 100, label: "100" },
  ];

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Order Book</span>
      </div>

      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
          <Button
            variant={mode === "split" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => onModeChange("split")}
          >
            <div className="flex flex-col gap-0.5">
              <div className="h-0.5 w-3 bg-destructive rounded" />
              <div className="h-0.5 w-3 bg-success rounded" />
            </div>
          </Button>
          <Button
            variant={mode === "buy" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => onModeChange("buy")}
          >
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          </Button>
          <Button
            variant={mode === "sell" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => onModeChange("sell")}
          >
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>

        {/* Precision Selector */}
        <Select
          value={precision.toString()}
          onValueChange={(value) => onPrecisionChange(parseFloat(value))}
        >
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {precisionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OrderBookRowProps {
  price: number;
  quantity: number;
  total: number;
  maxTotal: number;
  side: "bid" | "ask";
  precision: number;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}

export const OrderBookRow = memo(function OrderBookRow({
  price,
  quantity,
  total,
  maxTotal,
  side,
  precision,
  isHovered,
  onClick,
  onHover,
  onLeave,
}: OrderBookRowProps) {
  const depthPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  
  const getPrecisionDecimals = (prec: number) => {
    if (prec >= 1) return 2;
    if (prec >= 0.1) return 3;
    return 4;
  };

  const decimals = getPrecisionDecimals(precision);

  return (
    <motion.div
      className={cn(
        "relative grid grid-cols-3 gap-2 px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isHovered && "bg-muted/70"
      )}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Depth Background Bar */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 transition-all duration-300",
          side === "bid" ? "bg-success/10" : "bg-destructive/10"
        )}
        style={{ width: `${depthPercent}%` }}
      />

      {/* Price */}
      <div
        className={cn(
          "relative z-10 text-left font-medium",
          side === "bid" ? "text-success" : "text-destructive"
        )}
      >
        {price.toFixed(decimals)}
      </div>

      {/* Quantity */}
      <div className="relative z-10 text-right text-foreground">
        {quantity.toFixed(4)}
      </div>

      {/* Total */}
      <div className="relative z-10 text-right text-muted-foreground">
        {total.toFixed(2)}
      </div>
    </motion.div>
  );
});

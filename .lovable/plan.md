

## Fix: Slider Label Alignment (100% Overflow)

### Problem
The percentage labels (0%, 25%, 50%, 75%, 100%) use `flex justify-between`, while the diamond markers above them use absolute positioning with `left: X%` and `-translate-x-1/2`. This causes the **100% label to extend past the right edge** of the slider container, misaligning with its diamond.

### Solution
Replace the `flex justify-between` label row with **absolute positioning** matching the diamonds, but with edge clamping for 0% and 100%.

### Technical Details

**File: `src/components/trading/OrderFormPro.tsx` (lines 353-370)**

Replace the current label container:
```tsx
{/* Current — flex justify-between causes misalignment */}
<div className="flex justify-between">
  {[0, 25, 50, 75, 100].map(...)}
</div>
```

With a relatively-positioned container where each label is absolutely placed to match its diamond:
```tsx
<div className="relative h-4">
  {[0, 25, 50, 75, 100].map((pct, i, arr) => (
    <button
      key={pct}
      onClick={...}
      className={cn(
        "absolute text-[10px] font-medium transition-colors",
        // Edge clamping: first label left-aligned, last right-aligned, rest centered
        i === 0
          ? "left-0"
          : i === arr.length - 1
            ? "right-0"
            : "-translate-x-1/2",
        // Color logic stays the same
        activePercent !== null && activePercent >= pct
          ? isBuy ? "text-[#2EBD85]" : "text-[#F6465D]"
          : "text-[#4B5563]"
      )}
      style={i > 0 && i < arr.length - 1 ? { left: `${pct}%` } : undefined}
    >
      {pct}%
    </button>
  ))}
</div>
```

This ensures:
- **0%** is flush left (no offset)
- **25%, 50%, 75%** are centered on their diamonds via `-translate-x-1/2`
- **100%** is flush right (no overflow)

Single file change, ~18 lines replaced.


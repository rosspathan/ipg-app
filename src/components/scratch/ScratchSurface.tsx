import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/ismart-logo.png";

interface ScratchSurfaceProps {
  /** Called once the foil is scratched past the threshold (or tapped in reduced-motion mode). */
  onComplete: () => void;
  /** When true the foil is removed and the children are shown directly. */
  revealed?: boolean;
  /** Disables interaction (e.g. while a network request is in flight). */
  disabled?: boolean;
  /** Content shown underneath the foil. */
  children: React.ReactNode;
  className?: string;
  /** Label rendered on the foil. */
  foilLabel?: string;
}

const THRESHOLD = 0.55;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * A premium scratch-to-reveal foil surface. Drag a finger / mouse across the
 * golden foil to clear it and reveal the reward underneath. Falls back to a
 * single-tap reveal when the user prefers reduced motion.
 */
export function ScratchSurface({
  onComplete,
  revealed,
  disabled,
  children,
  className,
  foilLabel = "Scratch to reveal",
}: ScratchSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const firedRef = useRef(false);
  const lastSampleRef = useRef(0);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const [cleared, setCleared] = useState(false);
  const reduced = prefersReducedMotion();

  const paintFoil = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#caa24a");
      g.addColorStop(0.25, "#f7e29a");
      g.addColorStop(0.5, "#b8862f");
      g.addColorStop(0.75, "#f9edb0");
      g.addColorStop(1, "#9c6f23");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // diagonal sheen stripes
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#ffffff";
      for (let i = -h; i < w; i += 22) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.lineTo(i + h + 8, h);
        ctx.lineTo(i + 8, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // brand logo embossed on the foil
      const logo = logoRef.current;
      if (logo && logo.complete && logo.naturalWidth > 0) {
        const maxW = w * 0.62;
        const maxH = h * 0.5;
        const ratio = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
        const lw = logo.naturalWidth * ratio;
        const lh = logo.naturalHeight * ratio;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(logo, (w - lw) / 2, (h - lh) / 2 - h * 0.04, lw, lh);
        ctx.restore();
      }

      ctx.fillStyle = "rgba(60,40,5,0.7)";
      ctx.font = `600 ${Math.max(11, Math.min(14, w / 16))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(foilLabel.toUpperCase(), w / 2, h * 0.82);
    },
    [foilLabel],
  );


  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintFoil(ctx, rect.width, rect.height);
  }, [paintFoil]);

  // Preload the brand logo and repaint the foil once it's ready.
  useEffect(() => {
    if (revealed || reduced) return;
    const img = new Image();
    img.src = logoMark;
    logoRef.current = img;
    img.onload = () => {
      if (!firedRef.current) setup();
    };
  }, [revealed, reduced, setup]);

  useEffect(() => {
    if (revealed || reduced) return;
    setup();
    const ro = new ResizeObserver(() => {
      if (!firedRef.current) setup();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [revealed, reduced, setup]);

  const sampleCleared = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    try {
      const step = 8;
      const img = ctx.getImageData(0, 0, width, height).data;
      let transparent = 0;
      let count = 0;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const idx = (y * width + x) * 4 + 3;
          if (img[idx] === 0) transparent++;
          count++;
        }
      }
      if (count > 0 && transparent / count >= THRESHOLD && !firedRef.current) {
        firedRef.current = true;
        setCleared(true);
        onComplete();
      }
    } catch {
      // getImageData can throw on tainted canvas — ignore
    }
  }, [onComplete]);

  const scratchAt = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const handleDown = (e: React.PointerEvent) => {
    if (disabled || firedRef.current) return;
    drawingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    scratchAt(e.clientX, e.clientY);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || disabled || firedRef.current) return;
    scratchAt(e.clientX, e.clientY);
    const now = Date.now();
    if (now - lastSampleRef.current > 120) {
      lastSampleRef.current = now;
      sampleCleared();
    }
  };

  const handleUp = () => {
    drawingRef.current = false;
    sampleCleared();
  };

  const showFoil = !revealed && !reduced && !cleared;

  return (
    <div ref={containerRef} className={cn("relative select-none", className)}>
      {children}

      {showFoil && (
        <canvas
          ref={canvasRef}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          className={cn(
            "absolute inset-0 h-full w-full rounded-[inherit] touch-none",
            disabled ? "cursor-not-allowed opacity-90" : "cursor-pointer",
          )}
          style={{ touchAction: "none" }}
          aria-label="Scratch card foil"
        />
      )}

      {!revealed && reduced && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!firedRef.current) {
              firedRef.current = true;
              onComplete();
            }
          }}
          className="absolute inset-0 flex items-center justify-center rounded-[inherit] text-sm font-bold uppercase tracking-wide disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg,#caa24a,#f7e29a,#b8862f)",
            color: "rgba(60,40,5,0.85)",
          }}
        >
          Tap to reveal
        </button>
      )}
    </div>
  );
}

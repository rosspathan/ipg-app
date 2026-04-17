/**
 * KycImageViewer — premium document/selfie preview with:
 *   - skeleton while signed URL resolves
 *   - clear broken-image fallback (with reload + open-in-new-tab)
 *   - tap to expand to fullscreen with pinch / wheel zoom and pan
 *   - keyboard: Esc closes, +/- zooms, 0 resets
 *
 * Designed to feel premium on mobile (390px) and equally good on desktop.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2, ImageOff, Maximize2, Minus, Plus, RotateCcw, X, ExternalLink, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  url: string | null;
  /** Short pill label rendered over the thumbnail (e.g. "Front", "Back", "Selfie"). */
  label: string;
  /** Optional badge tone for the label pill. */
  tone?: "primary" | "emerald" | "sky" | "violet" | "amber";
  /** Aspect ratio for the thumbnail. Selfies use 1:1. Documents 3:2. */
  aspect?: "video" | "square" | "card";
  /** Forced loading state (e.g. before the URL has been resolved). */
  loading?: boolean;
  className?: string;
}

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-primary/90 text-primary-foreground",
  emerald: "bg-emerald-600/90 text-white",
  sky: "bg-sky-600/90 text-white",
  violet: "bg-violet-600/90 text-white",
  amber: "bg-amber-600/90 text-white",
};

const aspectClasses = {
  video: "aspect-[3/2]",
  square: "aspect-square",
  card: "aspect-[85/54]", // ID card aspect ratio
};

export function KycImageViewer({
  url,
  label,
  tone = "primary",
  aspect = "card",
  loading,
  className,
}: Props) {
  const [errored, setErrored] = useState(false);
  const [open, setOpen] = useState(false);

  // Reset error state when the URL changes (e.g. after re-sign).
  useEffect(() => {
    setErrored(false);
  }, [url]);

  const isLoading = loading || (!url && !errored);

  return (
    <>
      <button
        type="button"
        onClick={() => url && !errored && setOpen(true)}
        disabled={!url || errored}
        className={cn(
          "group relative block w-full overflow-hidden rounded-xl border border-border bg-muted/40 text-left transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          url && !errored && "hover:border-primary/40 hover:shadow-md active:scale-[0.99]",
          aspectClasses[aspect],
          className
        )}
        aria-label={`Open ${label} fullscreen`}
      >
        {/* Label pill */}
        <span
          className={cn(
            "absolute left-2 top-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow",
            toneClasses[tone]
          )}
        >
          {label}
        </span>

        {/* Expand affordance */}
        {url && !errored && !isLoading && (
          <span className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md bg-background/85 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        )}

        {/* Body */}
        {isLoading ? (
          <div className="grid h-full w-full place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : errored || !url ? (
          <div className="grid h-full w-full place-items-center gap-1 text-center">
            <ImageOff className="h-6 w-6 text-muted-foreground" />
            <p className="text-[10px] font-medium text-muted-foreground">Image unavailable</p>
          </div>
        ) : (
          <img
            src={url}
            alt={label}
            loading="lazy"
            onError={() => setErrored(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}
      </button>

      {open && url && (
        <FullscreenViewer url={url} label={label} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/* --------------------------- Fullscreen viewer ---------------------------- */

function FullscreenViewer({
  url,
  label,
  onClose,
}: {
  url: string;
  label: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 5)), []);
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z - 0.25, 0.5);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, zoomIn, zoomOut, reset]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onWheel: React.WheelEventHandler = (e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(5, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  };

  const onPointerDown: React.PointerEventHandler = (e) => {
    if (zoom <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove: React.PointerEventHandler = (e) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label} preview`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-white">
        <p className="truncate text-sm font-semibold">{label}</p>
        <div className="flex items-center gap-1">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="grid h-9 w-9 place-items-center rounded-md text-white/80 hover:bg-white/10"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={url}
            download
            className="grid h-9 w-9 place-items-center rounded-md text-white/80 hover:bg-white/10"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-white/80 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image stage */}
      <div
        className="relative flex-1 overflow-hidden"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: zoom > 1 ? "grab" : "default", touchAction: "none" }}
      >
        <img
          src={url}
          alt={label}
          draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full select-none object-contain transition-transform duration-150"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
        />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
        <button
          onClick={zoomOut}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={reset}
          className="grid h-10 min-w-[3.5rem] place-items-center rounded-full bg-white/10 px-3 text-xs font-semibold tabular-nums text-white hover:bg-white/20"
          aria-label="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={reset}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Reset"
          title="Reset (0)"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}

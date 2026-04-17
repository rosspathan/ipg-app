import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onCapture: (blob: Blob, dataUrl: string) => void | Promise<void>;
  uploading?: boolean;
  className?: string;
}

/**
 * Live selfie capture component using getUserMedia.
 * - Square 1:1 capture (mobile-friendly).
 * - Front camera by default, with retake support.
 * - Falls back to a clear error state when camera is denied.
 */
export function SelfieCapture({ onCapture, uploading, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<"idle" | "starting" | "live" | "captured" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setState("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("live");
    } catch (e: any) {
      console.error("[SelfieCapture] camera error", e);
      setError(
        e?.name === "NotAllowedError"
          ? "Camera permission denied. Enable camera access in your browser settings."
          : "Unable to start camera. Please try again."
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Center-crop to square, mirror so the saved image matches the live preview
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl);
    setState("captured");
    stop();

    canvas.toBlob(
      async (blob) => {
        if (blob) await onCapture(blob, dataUrl);
      },
      "image/jpeg",
      0.92
    );
  }, [onCapture, stop]);

  const retake = useCallback(() => {
    setPreview(null);
    start();
  }, [start]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
        {state === "captured" && preview ? (
          <img src={preview} alt="Selfie preview" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn(
              "absolute inset-0 h-full w-full object-cover -scale-x-100 transition-opacity",
              state === "live" ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Idle prompt */}
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium">Take a live selfie</p>
            <p className="text-xs text-muted-foreground max-w-[18rem]">
              Center your face in the circle. Good lighting helps admins verify you faster.
            </p>
          </div>
        )}

        {state === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Face guide overlay when live */}
        {state === "live" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[78%] w-[68%] rounded-[50%] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {state === "idle" && (
          <Button onClick={start} className="min-w-[10rem]">
            <Camera className="mr-2 h-4 w-4" /> Start camera
          </Button>
        )}
        {state === "error" && (
          <Button onClick={start} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        )}
        {state === "live" && (
          <Button onClick={capture} className="min-w-[10rem]">
            <Camera className="mr-2 h-4 w-4" /> Capture selfie
          </Button>
        )}
        {state === "captured" && (
          <>
            <Button onClick={retake} variant="outline" disabled={uploading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {uploading ? "Uploading…" : "Captured — sent for review"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

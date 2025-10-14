import { useEffect, useRef, useState } from 'react';

interface Segment {
  id: string;
  label: string;
  multiplier: number;
  weight: number;
  color_hex: string;
}

interface SpinWheelBasicProps {
  segments: Segment[];
  isSpinning: boolean;
  winningSegmentIndex?: number;
  onSpinComplete?: () => void;
}

export function SpinWheelBasic({
  segments,
  isSpinning,
  winningSegmentIndex,
  onSpinComplete
}: SpinWheelBasicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>();

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 140;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments
    const segmentAngle = (2 * Math.PI) / segments.length;
    
    segments.forEach((segment, index) => {
      const startAngle = index * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color_hex;
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText(segment.label, radius * 0.65, 0);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#6b7280';
    ctx.fill();
  }, [segments, rotation]);

  // Handle spin animation
  useEffect(() => {
    if (!isSpinning || winningSegmentIndex === undefined) return;

    const segmentAngle = 360 / segments.length;
    const targetAngle = winningSegmentIndex * segmentAngle;
    
    // 5 full rotations + land on winning segment
    const totalRotation = 360 * 5 + (360 - targetAngle);
    const duration = 3000; // 3 seconds
    const startTime = Date.now();
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentRotation = startRotation + (totalRotation * easeProgress);
      setRotation(currentRotation % 360);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onSpinComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, winningSegmentIndex, segments.length, onSpinComplete]);

  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-[320px] text-muted-foreground">
        No segments configured
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Static Arrow Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <svg width="40" height="40" viewBox="0 0 40 40" className="drop-shadow-lg">
          <polygon 
            points="20,35 10,5 20,10 30,5" 
            fill="#fbbf24" 
            stroke="#ffffff" 
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Wheel Container */}
      <div 
        className="relative transition-transform duration-100 ease-linear"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="rounded-full shadow-xl"
        />
      </div>
    </div>
  );
}

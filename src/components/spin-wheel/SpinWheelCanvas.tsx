import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface SpinSegment {
  id: string;
  label: string;
  multiplier: number;
  color_hex: string;
  weight: number;
}

interface SpinWheelCanvasProps {
  segments: SpinSegment[];
  isSpinning: boolean;
  result?: SpinSegment;
  onSpinComplete?: () => void;
}

export function SpinWheelCanvas({ segments, isSpinning, result, onSpinComplete }: SpinWheelCanvasProps) {
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || segments.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate angles
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    let currentAngle = rotation * (Math.PI / 180);

    segments.forEach((segment) => {
      const sliceAngle = (segment.weight / totalWeight) * 2 * Math.PI;

      // Draw segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = segment.color_hex;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(currentAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${segment.multiplier}x`, radius - 20, 5);
      ctx.restore();

      currentAngle += sliceAngle;
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(centerX, 10);
    ctx.lineTo(centerX - 15, 40);
    ctx.lineTo(centerX + 15, 40);
    ctx.closePath();
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [segments, rotation]);

  useEffect(() => {
    if (isSpinning && result) {
      // Calculate final rotation to land on result
      const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
      let targetAngle = 0;
      let currentWeight = 0;
      
      for (const segment of segments) {
        if (segment.id === result.id) {
          targetAngle = (currentWeight / totalWeight) * 360 + (segment.weight / totalWeight) * 180;
          break;
        }
        currentWeight += segment.weight;
      }

      // Spin multiple rotations + target angle
      const finalRotation = 360 * 5 + targetAngle;
      setRotation(finalRotation);

      setTimeout(() => {
        onSpinComplete?.();
      }, 3000);
    }
  }, [isSpinning, result, segments, onSpinComplete]);

  return (
    <motion.div
      animate={{ rotate: rotation }}
      transition={{ duration: 3, ease: "easeOut" }}
      className="relative"
    >
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="max-w-full"
      />
    </motion.div>
  );
}

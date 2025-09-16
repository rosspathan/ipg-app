import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SpinWheelProps {
  segments: Array<{
    id: string;
    label: string;
    color?: string;
    weight: number;
    reward_type: string;
    reward_value: number;
    reward_token: string;
  }>;
  onSpin: () => Promise<any>;
  isSpinning: boolean;
  winningSegment?: any;
  disabled?: boolean;
}

export const SpinWheelEnhanced = ({ 
  segments, 
  onSpin, 
  isSpinning, 
  winningSegment,
  disabled = false 
}: SpinWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Default colors for segments if not provided
  const defaultColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F06292',
    '#AED581', '#FFB74D', '#A1C4FD', '#C2E9FB'
  ];

  useEffect(() => {
    drawWheel();
  }, [segments]);

  useEffect(() => {
    if (winningSegment && !isSpinning) {
      // Calculate the angle to land on the winning segment
      const segmentAngle = 360 / segments.length;
      const winningIndex = segments.findIndex(s => s.id === winningSegment.segment_id);
      
      if (winningIndex !== -1) {
        // Calculate final rotation to land on winning segment
        const targetAngle = (winningIndex * segmentAngle) + (segmentAngle / 2);
        const spins = 5; // Number of full rotations
        const finalRotation = (spins * 360) + (360 - targetAngle);
        
        setRotation(prev => prev + finalRotation);
        setIsAnimating(true);
        
        setTimeout(() => {
          setIsAnimating(false);
        }, 3000);
      }
    }
  }, [winningSegment, isSpinning, segments]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.stroke();

    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    let currentAngle = -Math.PI / 2; // Start from top

    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI;
      const color = segment.color || defaultColors[index % defaultColors.length];

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      const textAngle = currentAngle + segmentAngle / 2;
      const textRadius = radius * 0.7;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(segment.label, 0, 0);
      ctx.restore();

      currentAngle += segmentAngle;
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw pointer
    drawPointer(ctx, centerX, centerY - radius - 10);
  };

  const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 15, y - 20);
    ctx.lineTo(x + 15, y - 20);
    ctx.closePath();
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add glow effect
    ctx.shadowColor = '#FF6B6B';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const handleSpin = async () => {
    if (disabled || isSpinning) return;
    
    setIsAnimating(true);
    await onSpin();
  };

  const getTotalWeight = () => segments.reduce((sum, s) => sum + s.weight, 0);
  
  const getSegmentProbability = (weight: number) => {
    const total = getTotalWeight();
    return total > 0 ? ((weight / total) * 100).toFixed(1) : "0";
  };

  return (
    <div className="space-y-6">
      {/* Wheel Container */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div 
              ref={wheelRef}
              className={`relative transition-transform duration-3000 ease-out ${
                isAnimating ? 'animate-spin-wheel' : ''
              }`}
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
            >
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className="drop-shadow-lg"
              />
            </div>
          </div>
          
          {/* Particles effect for winning */}
          {winningSegment && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="confetti">
                {Array.from({ length: 50 }).map((_, i) => (
                  <div
                    key={i}
                    className="confetti-piece"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      backgroundColor: defaultColors[i % defaultColors.length]
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spin Button */}
      <div className="text-center">
        <Button
          size="lg"
          onClick={handleSpin}
          disabled={disabled || isSpinning}
          className={`
            w-48 h-16 text-xl font-bold rounded-full
            ${isSpinning 
              ? 'animate-pulse' 
              : 'hover:scale-105 transition-transform'
            }
          `}
        >
          {isSpinning ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Spinning...
            </div>
          ) : (
            <>
              🎰 SPIN TO WIN! 🎰
            </>
          )}
        </Button>
      </div>

      {/* Segment Details */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">Prize Details</h3>
          <div className="grid gap-2 max-h-40 overflow-y-auto">
            {segments.map((segment, index) => (
              <div 
                key={segment.id}
                className={`
                  flex items-center justify-between p-2 rounded-lg transition-all
                  ${winningSegment?.segment_id === segment.id 
                    ? 'bg-primary/20 border-2 border-primary animate-pulse' 
                    : 'bg-muted/50'
                  }
                `}
                style={{ 
                  borderLeft: `4px solid ${segment.color || defaultColors[index % defaultColors.length]}` 
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{segment.label}</span>
                  {segment.reward_type !== "nothing" && (
                    <span className="text-xs text-muted-foreground">
                      {segment.reward_value} {segment.reward_token || segment.reward_type}
                    </span>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {getSegmentProbability(segment.weight)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <style>{`
        .animate-spin-wheel {
          animation: spinWheel 3s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        @keyframes spinWheel {
          from { transform: rotate(0deg); }
          to { transform: rotate(var(--final-rotation, 1800deg)); }
        }
        .confetti {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          animation: confetti 3s ease-out forwards;
        }
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
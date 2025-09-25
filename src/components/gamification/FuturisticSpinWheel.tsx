import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Coins, Trophy, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinSegment {
  id: string;
  label: string;
  color?: string;
  weight: number;
  reward_type: string;
  reward_value: number;
  reward_token: string;
}

interface FuturisticSpinWheelProps {
  segments: SpinSegment[];
  onSpin: () => Promise<any>;
  isSpinning: boolean;
  winningSegment?: any;
  disabled?: boolean;
  freeSpinsLeft: number;
  cooldownRemaining: number;
}

export const FuturisticSpinWheel = ({ 
  segments, 
  onSpin, 
  isSpinning, 
  winningSegment,
  disabled = false,
  freeSpinsLeft,
  cooldownRemaining
}: FuturisticSpinWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Default colors for WIN/LOSE segments
  const segmentColors = {
    win: '#00ff88',
    lose: '#ff0066'
  };

  useEffect(() => {
    drawWheel();
  }, [segments]);

  // Start spinning immediately when isSpinning becomes true
  useEffect(() => {
    if (isSpinning && !isAnimating) {
      console.log("🎪 Starting immediate spin animation");
      setIsAnimating(true);
      // Start with a fast continuous spin animation for smooth circular motion
      const continuousSpin = setInterval(() => {
        setRotation(prev => prev + 15); // Faster rotation for better circular motion
      }, 8); // Higher frequency for smoother animation
      
      // Store interval ref for cleanup
      const intervalRef = continuousSpin;
      
      // Clean up when not spinning anymore
      const cleanup = () => {
        clearInterval(intervalRef);
      };
      
      return cleanup;
    }
  }, [isSpinning, isAnimating]);

  // Handle result when spin completes
  useEffect(() => {
    if (winningSegment && !isSpinning && isAnimating) {
      console.log("🎪 Handling spin result", winningSegment);
      
      // Calculate the angle to land on the winning segment
      const segmentAngle = 360 / segments.length;
      const winningIndex = segments.findIndex(s => 
        s.label === winningSegment.label || 
        s.id === winningSegment.segment_id
      );
      
      if (winningIndex !== -1) {
        // Calculate final rotation to land on winning segment  
        const targetAngle = (winningIndex * segmentAngle) + (segmentAngle / 2);
        const spins = 3; // Additional rotations for dramatic effect
        const finalRotation = (spins * 360) + (360 - targetAngle);
        
        setRotation(prev => prev + finalRotation);
        setResultData(winningSegment);
        
        setTimeout(() => {
          setIsAnimating(false);
          setShowResultDialog(true);
        }, 3000);
      }
    }
  }, [winningSegment, isSpinning, segments, isAnimating]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas with dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create gradient background
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 30);
    bgGradient.addColorStop(0, 'rgba(0, 255, 136, 0.1)');
    bgGradient.addColorStop(0.5, 'rgba(255, 0, 102, 0.1)');
    bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw outer glow ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Draw metallic outer ring
    const metalGradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    metalGradient.addColorStop(0, '#4a5568');
    metalGradient.addColorStop(0.5, '#718096');
    metalGradient.addColorStop(1, '#2d3748');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.strokeStyle = metalGradient;
    ctx.lineWidth = 12;
    ctx.stroke();

    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    let currentAngle = -Math.PI / 2; // Start from top

    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI;
      const isWin = segment.label.includes('WIN');
      const color = isWin ? segmentColors.win : segmentColors.lose;

      // Create gradient for each segment
      const segmentGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
      if (isWin) {
        segmentGradient.addColorStop(0, '#00ff88');
        segmentGradient.addColorStop(0.7, '#00cc6a');
        segmentGradient.addColorStop(1, '#009951');
      } else {
        segmentGradient.addColorStop(0, '#ff0066');
        segmentGradient.addColorStop(0.7, '#cc0052');
        segmentGradient.addColorStop(1, '#99003d');
      }

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle);
      ctx.closePath();
      ctx.fillStyle = segmentGradient;
      ctx.fill();

      // Add inner glow
      ctx.shadowColor = isWin ? '#00ff88' : '#ff0066';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw segment border with glow
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text with glow effect
      const textAngle = currentAngle + segmentAngle / 2;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      
      // Text glow
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(segment.label, 0, 0);
      
      // Reward text
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.fillText(`${segment.reward_value > 0 ? '+' : ''}${segment.reward_value} BSK`, 0, 20);
      ctx.restore();

      currentAngle += segmentAngle;
    });

    // Draw center logo area
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40);
    centerGradient.addColorStop(0, '#2d3748');
    centerGradient.addColorStop(0.5, '#4a5568');
    centerGradient.addColorStop(1, '#1a202c');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = centerGradient;
    ctx.fill();
    
    // Center glow
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Center border
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.stroke();

    // IPG text in center
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 5;
    ctx.fillText('IPG', centerX, centerY + 6);

    // Draw pointer
    drawPointer(ctx, centerX, centerY - radius - 25);
  };

  const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Futuristic pointer with glow
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 20, y - 30);
    ctx.lineTo(x + 20, y - 30);
    ctx.closePath();
    
    // Gradient pointer
    const pointerGradient = ctx.createLinearGradient(x - 20, y - 30, x + 20, y);
    pointerGradient.addColorStop(0, '#ff0066');
    pointerGradient.addColorStop(0.5, '#ff3384');
    pointerGradient.addColorStop(1, '#ff66a3');
    
    ctx.fillStyle = pointerGradient;
    ctx.fill();
    
    // Pointer glow
    ctx.shadowColor = '#ff0066';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Pointer border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const handleSpin = async () => {
    console.log("🎪 FuturisticSpinWheel: handleSpin called!", { 
      disabled, 
      isSpinning, 
      cooldownRemaining,
      canSpin: !disabled && !isSpinning && cooldownRemaining === 0
    });
    
    if (disabled || isSpinning || cooldownRemaining > 0) {
      console.log("🎪 FuturisticSpinWheel: Spin blocked");
      return;
    }
    
    console.log("🎪 FuturisticSpinWheel: Calling onSpin...");
    setIsAnimating(true);
    setShowResultDialog(false);
    setResultData(null);
    await onSpin();
  };

  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const canSpin = !disabled && !isSpinning && cooldownRemaining === 0;

  return (
    <div className="space-y-4">
      {/* Custom CSS for mobile animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spinWheelMobile {
            from { transform: rotate(0deg); }
            to { transform: rotate(var(--final-rotation, 2880deg)); }
          }
          
          @keyframes neonPulseMobile {
            0%, 100% { box-shadow: 0 0 15px rgba(147, 51, 234, 0.4), 0 0 30px rgba(147, 51, 234, 0.2); }
            50% { box-shadow: 0 0 25px rgba(147, 51, 234, 0.6), 0 0 50px rgba(147, 51, 234, 0.3); }
          }
          
          @keyframes glowButtonMobile {
            0%, 100% { box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
            50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.7), 0 0 50px rgba(168, 85, 247, 0.3); }
          }
          
          .mobile-spin-wheel-container {
            position: relative;
            background: radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(168, 85, 247, 0.1) 50%, transparent 100%);
            border-radius: 50%;
            animation: neonPulseMobile 2s ease-in-out infinite;
            padding: 20px;
          }
          
          .mobile-spin-wheel-canvas {
            filter: drop-shadow(0 0 15px rgba(147, 51, 234, 0.4));
          }
          
          .mobile-spin-button-glow {
            animation: glowButtonMobile 2s ease-in-out infinite;
          }
        `
      }} />
      
      {/* Wheel Container - Mobile Optimized */}
      <div className="flex justify-center">
        <div className="mobile-spin-wheel-container">
          <div 
            ref={wheelRef}
            className="mobile-spin-wheel-canvas"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
          >
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Result Dialog - Mobile Optimized */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-sm mx-4 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-purple-500/30 text-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl">
              {resultData?.reward?.value > 0 ? (
                <span className="text-green-400">🎉 YOU WON! 🎉</span>
              ) : (
                <span className="text-red-400">😢 TRY AGAIN</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="text-5xl mb-4">
              {resultData?.reward?.value > 0 ? '🏆' : '💫'}
            </div>
            <div className="text-lg font-bold mb-2 text-purple-300">
              {resultData?.label}
            </div>
            <div className={cn(
              "text-2xl font-bold mb-2",
              resultData?.reward?.value > 0 ? "text-green-400" : "text-red-400"
            )}>
              {resultData?.reward?.value > 0 ? '+' : ''}{resultData?.reward?.value} BSK
            </div>
            <div className="text-sm text-slate-400">
              {resultData?.reward?.value > 0 
                ? "BSK added to your bonus balance!" 
                : "BSK deducted from your bonus balance"}
            </div>
          </div>
          <Button 
            onClick={() => setShowResultDialog(false)} 
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
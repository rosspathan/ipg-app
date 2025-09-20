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

  useEffect(() => {
    if (winningSegment && !isSpinning) {
      // Calculate the angle to land on the winning segment
      const segmentAngle = 360 / segments.length;
      const winningIndex = segments.findIndex(s => s.id === winningSegment.segment_id);
      
      if (winningIndex !== -1) {
        // Calculate final rotation to land on winning segment
        const targetAngle = (winningIndex * segmentAngle) + (segmentAngle / 2);
        const spins = 8; // Number of full rotations for dramatic effect
        const finalRotation = (spins * 360) + (360 - targetAngle);
        
        setRotation(prev => prev + finalRotation);
        setIsAnimating(true);
        setResultData(winningSegment);
        
        setTimeout(() => {
          setIsAnimating(false);
          setShowResultDialog(true);
        }, 4000);
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
    if (disabled || isSpinning || cooldownRemaining > 0) return;
    
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
    <div className="space-y-6">
      {/* Custom CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spinWheel {
            from { transform: rotate(0deg); }
            to { transform: rotate(var(--final-rotation, 2880deg)); }
          }
          
          @keyframes neonPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.5), 0 0 40px rgba(0, 255, 136, 0.3); }
            50% { box-shadow: 0 0 30px rgba(0, 255, 136, 0.8), 0 0 60px rgba(0, 255, 136, 0.5); }
          }
          
          @keyframes glowButton {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 102, 0.5); }
            50% { box-shadow: 0 0 40px rgba(255, 0, 102, 0.8), 0 0 60px rgba(255, 0, 102, 0.4); }
          }
          
          @keyframes particleFloat {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
          }
          
          .spin-wheel-container {
            position: relative;
            background: radial-gradient(circle, rgba(0, 255, 136, 0.1) 0%, rgba(255, 0, 102, 0.1) 50%, rgba(0, 0, 0, 0.9) 100%);
            border-radius: 50%;
            animation: neonPulse 3s ease-in-out infinite;
          }
          
          .spin-wheel-canvas {
            transition: transform 4s cubic-bezier(0.23, 1, 0.32, 1);
            filter: drop-shadow(0 0 20px rgba(0, 255, 136, 0.5));
          }
          
          .spin-button-glow {
            animation: glowButton 2s ease-in-out infinite;
          }
          
          .floating-particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
          }
          
          .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: linear-gradient(45deg, #00ff88, #ff0066);
            border-radius: 50%;
            animation: particleFloat 3s linear infinite;
          }
        `
      }} />
      
      {/* Wheel Container */}
      <Card className="relative overflow-hidden bg-background/5 border-primary/20">
        <CardContent className="flex justify-center items-center p-8 relative">
          {/* Background particles */}
          <div className="floating-particles">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
          
          <div className="spin-wheel-container p-4 rounded-full">
            <div 
              ref={wheelRef}
              className="spin-wheel-canvas"
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
            >
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="drop-shadow-2xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-2 text-green-400" />
            <div className="text-lg font-bold text-green-400">{freeSpinsLeft}</div>
            <div className="text-xs text-muted-foreground">Free Spins</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <Coins className="h-6 w-6 mx-auto mb-2 text-blue-400" />
            <div className="text-lg font-bold text-blue-400">
              {cooldownRemaining > 0 ? formatCooldown(cooldownRemaining) : "Ready"}
            </div>
            <div className="text-xs text-muted-foreground">Cooldown</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-purple-400" />
            <div className="text-lg font-bold text-purple-400">±5</div>
            <div className="text-xs text-muted-foreground">BSK Reward</div>
          </CardContent>
        </Card>
      </div>

      {/* Spin Button */}
      <div className="text-center">
        <Button
          size="lg"
          onClick={handleSpin}
          disabled={!canSpin}
          className={cn(
            "w-64 h-16 text-xl font-bold rounded-full relative overflow-hidden",
            "bg-gradient-to-r from-primary to-primary/80",
            "hover:from-primary/90 hover:to-primary/70",
            "disabled:from-muted disabled:to-muted/80",
            canSpin && !isSpinning && "spin-button-glow",
            isSpinning && "animate-pulse"
          )}
        >
          {isSpinning ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>SPINNING...</span>
            </div>
          ) : cooldownRemaining > 0 ? (
            <span>WAIT {formatCooldown(cooldownRemaining)}</span>
          ) : (
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <span>SPIN TO WIN</span>
              <Star className="h-5 w-5" />
            </div>
          )}
        </Button>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {resultData?.reward?.value > 0 ? (
                <span className="text-green-400">🎉 CONGRATULATIONS! 🎉</span>
              ) : (
                <span className="text-red-400">😢 BETTER LUCK NEXT TIME</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="text-6xl mb-4">
              {resultData?.reward?.value > 0 ? '🏆' : '💫'}
            </div>
            <div className="text-xl font-bold mb-2">
              {resultData?.label}
            </div>
            <div className={cn(
              "text-3xl font-bold",
              resultData?.reward?.value > 0 ? "text-green-400" : "text-red-400"
            )}>
              {resultData?.reward?.value > 0 ? '+' : ''}{resultData?.reward?.value} BSK
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {resultData?.reward?.value > 0 
                ? "You won BSK Coins!" 
                : "You lost BSK Coins!"}
            </div>
          </div>
          <Button onClick={() => setShowResultDialog(false)} className="w-full">
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface AdPlayerProps {
  ad: {
    id: string;
    title: string;
    image_url: string;
    media_type: string | null;
    required_view_time_seconds: number;
    reward_bsk: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onComplete: (adId: string, viewTimeSeconds: number) => Promise<void>;
}

export function AdPlayer({ ad, isOpen, onClose, onComplete }: AdPlayerProps) {
  const [viewTime, setViewTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isVideo = ad.media_type === 'video';
  const progress = (viewTime / ad.required_view_time_seconds) * 100;
  const canClaim = viewTime >= ad.required_view_time_seconds;

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setViewTime(0);
      setIsPlaying(true);
      setIsCompleted(false);
      setShowConfetti(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Start timer
    if (isPlaying && !isCompleted) {
      timerRef.current = setInterval(() => {
        setViewTime(prev => {
          const next = prev + 1;
          if (next >= ad.required_view_time_seconds) {
            setIsCompleted(true);
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPlaying, isCompleted, ad.required_view_time_seconds]);

  useEffect(() => {
    // Handle video playback
    if (videoRef.current && isVideo) {
      if (isPlaying) {
        videoRef.current.play().catch(err => console.error('Video play error:', err));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isVideo]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return;
    
    setIsClaiming(true);
    try {
      await onComplete(ad.id, viewTime);
      setShowConfetti(true);
      
      // Auto close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Claim error:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClose = () => {
    if (!isCompleted && viewTime > 0) {
      // Warn user they'll lose progress
      const confirm = window.confirm('Are you sure? Your progress will be lost.');
      if (!confirm) return;
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 bg-background border-primary/20 overflow-hidden">
        {showConfetti && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.3}
          />
        )}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background to-transparent">
          <h3 className="text-lg font-heading font-semibold text-foreground">{ad.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-foreground hover:bg-foreground/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Media Content */}
        <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
          {isVideo ? (
            <video
              ref={videoRef}
              src={ad.image_url}
              className="w-full h-full object-contain"
              muted={isMuted}
              loop
            />
          ) : (
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full h-full object-contain"
            />
          )}

          {/* Play/Pause Overlay */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center"
              >
                <Button
                  size="lg"
                  onClick={handleTogglePlay}
                  className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
                >
                  <Play className="w-8 h-8 ml-1" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="p-4 bg-card space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatTime(viewTime)} / {formatTime(ad.required_view_time_seconds)}
              </span>
              <span className="text-primary font-semibold">
                +{ad.reward_bsk} BSK
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isCompleted ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleTogglePlay}
                  className="shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                {isVideo && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleToggleMute}
                    className="shrink-0"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                )}
                <div className="flex-1 text-center text-sm text-muted-foreground">
                  {canClaim ? '✓ Ready to claim!' : 'Keep watching to claim reward...'}
                </div>
              </>
            ) : (
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              >
                {isClaiming ? 'Claiming...' : `Claim ${ad.reward_bsk} BSK`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

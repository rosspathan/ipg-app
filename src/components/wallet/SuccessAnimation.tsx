import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Confetti from "react-confetti";
import { useState, useEffect } from "react";

interface SuccessAnimationProps {
  title: string;
  subtitle?: string;
  showConfetti?: boolean;
  onComplete?: () => void;
}

export function SuccessAnimation({ 
  title, 
  subtitle, 
  showConfetti = true,
  onComplete 
}: SuccessAnimationProps) {
  const [windowSize, setWindowSize] = useState({ width: 300, height: 400 });
  const [confettiActive, setConfettiActive] = useState(showConfetti);

  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });

    // Stop confetti after 3 seconds
    const timer = setTimeout(() => {
      setConfettiActive(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative">
      {confettiActive && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
          colors={['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']}
        />
      )}
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 15
        }}
        className="text-center space-y-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 15,
            delay: 0.2
          }}
        >
          <div className="relative inline-block">
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/30"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{
                duration: 1,
                repeat: 2,
                repeatType: "loop"
              }}
            />
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-foreground"
        >
          {title}
        </motion.h2>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground"
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

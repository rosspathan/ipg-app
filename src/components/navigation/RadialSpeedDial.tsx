import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpCircle, Grid3x3, Repeat, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadialSpeedDialProps {
  isOpen: boolean;
  onClose: () => void;
  onItemClick: (action: string) => void;
  className?: string;
}

const speedDialItems = [
  {
    id: 'deposit',
    label: 'Deposit',
    icon: ArrowUpCircle,
    path: '/app/wallet?tab=deposit',
    angle: 45, // top-right
    color: 'hsl(142, 76%, 36%)', // green
  },
  {
    id: 'programs',
    label: 'Programs',
    icon: Grid3x3,
    path: '/app/programs',
    angle: 135, // top-left
    color: 'hsl(262, 83%, 58%)', // purple
  },
  {
    id: 'convert',
    label: 'Convert',
    icon: Repeat,
    path: '/app/swap',
    angle: 225, // bottom-left
    color: 'hsl(199, 89%, 48%)', // cyan
  },
  {
    id: 'trade',
    label: 'Trade',
    icon: TrendingUp,
    path: '/app/trade',
    angle: 315, // bottom-right
    color: 'hsl(31, 97%, 52%)', // orange
  },
];

export const RadialSpeedDial: React.FC<RadialSpeedDialProps> = ({
  isOpen,
  onClose,
  onItemClick,
  className,
}) => {
  const radius = 100; // Distance from center

  const getPosition = (angle: number) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radian) * radius,
      y: -Math.sin(radian) * radius, // Negative because CSS y-axis is inverted
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-40"
            onClick={onClose}
            data-testid="speed-dial-backdrop"
          />

          {/* Speed dial items */}
          <div className={cn("fixed z-50", className)}>
            {speedDialItems.map((item, index) => {
              const position = getPosition(item.angle);
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.id}
                  initial={{
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 0,
                  }}
                  animate={{
                    scale: 1,
                    x: position.x,
                    y: position.y,
                    opacity: 1,
                  }}
                  exit={{
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    delay: index * 0.05,
                  }}
                  onClick={() => {
                    onItemClick(item.path);
                    onClose();
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 group"
                  whileTap={{ scale: 0.9 }}
                  data-testid={`speed-dial-${item.id}`}
                >
                  {/* Icon button with glow */}
                  <motion.div
                    className="relative"
                    whileHover={{ scale: 1.1 }}
                  >
                    {/* Glow effect */}
                    <div
                      className="absolute inset-0 rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-opacity"
                      style={{
                        background: item.color,
                        transform: 'scale(1.2)',
                      }}
                    />
                    
                    {/* Button */}
                    <div
                      className="relative w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/20 backdrop-blur-xl shadow-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${item.color}E6 0%, ${item.color}CC 100%)`,
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </motion.div>

                  {/* Label */}
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                    className="text-xs font-bold text-foreground bg-card/95 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border/30 shadow-lg"
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              );
            })}

            {/* Center close button */}
            <motion.button
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={onClose}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-card/95 backdrop-blur-xl border-2 border-border/40 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform"
              whileTap={{ scale: 0.9 }}
              data-testid="speed-dial-close"
            >
              <X className="h-7 w-7 text-foreground" />
            </motion.button>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

import { CleanCard } from "./CleanCard";
import { TrendingUp, DollarSign, Target } from "lucide-react";

interface MiniStat {
  label: string;
  value: string;
  icon: typeof TrendingUp;
}

const miniStats: MiniStat[] = [
  { label: "Staking TVL", value: "$2.4M", icon: DollarSign },
  { label: "Spin RTP", value: "94.2%", icon: TrendingUp },
  { label: "Draw Fill", value: "87%", icon: Target },
];

interface ProgramHealthMiniProps {
  className?: string;
}

export function ProgramHealthMini({ className }: ProgramHealthMiniProps) {
  return (
    <CleanCard padding="lg" className={className}>
      <h2 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-4">
        Program Health
      </h2>
      <div className="space-y-3">
        {miniStats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[hsl(262_100%_65%/0.1)]">
                <stat.icon className="w-4 h-4 text-[hsl(262_100%_65%)]" />
              </div>
              <span className="text-sm text-[hsl(220_9%_65%)]">{stat.label}</span>
            </div>
            <span className="text-sm font-bold text-[hsl(0_0%_98%)]" style={{ fontFeatureSettings: "'tnum'" }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </CleanCard>
  );
}

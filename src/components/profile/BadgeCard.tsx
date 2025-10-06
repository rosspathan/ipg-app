import * as React from "react"
import { Award, Sparkles, Shield, Crown, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserBadge } from "@/hooks/useUserBadge"
import { Skeleton } from "@/components/ui/skeleton"

interface BadgeConfig {
  name: string
  icon: React.ReactNode
  gradient: string
  borderColor: string
  glowColor: string
  textColor: string
  bgPattern: string
  premium?: boolean
}

const badgeConfigs: Record<string, BadgeConfig> = {
  "None": {
    name: "Member",
    icon: <Award className="h-8 w-8" />,
    gradient: "from-muted/40 via-muted/20 to-muted/40",
    borderColor: "border-border/40",
    glowColor: "shadow-lg",
    textColor: "text-muted-foreground",
    bgPattern: "bg-card/80"
  },
  "Bronze": {
    name: "Bronze",
    icon: <Shield className="h-8 w-8" />,
    gradient: "from-amber-900/40 via-amber-700/30 to-amber-900/40",
    borderColor: "border-amber-700/50",
    glowColor: "shadow-[0_0_30px_rgba(180,83,9,0.3)]",
    textColor: "text-amber-600",
    bgPattern: "bg-gradient-to-br from-amber-950/60 to-amber-900/40"
  },
  "Silver": {
    name: "Silver",
    icon: <Star className="h-8 w-8" />,
    gradient: "from-slate-400/40 via-slate-200/30 to-slate-400/40",
    borderColor: "border-slate-400/60",
    glowColor: "shadow-[0_0_30px_rgba(148,163,184,0.4)]",
    textColor: "text-slate-300",
    bgPattern: "bg-gradient-to-br from-slate-800/60 to-slate-700/40"
  },
  "Gold": {
    name: "Gold",
    icon: <Crown className="h-8 w-8" />,
    gradient: "from-yellow-500/40 via-yellow-300/30 to-yellow-500/40",
    borderColor: "border-yellow-500/60",
    glowColor: "shadow-[0_0_35px_rgba(234,179,8,0.5)]",
    textColor: "text-yellow-400",
    bgPattern: "bg-gradient-to-br from-yellow-900/60 to-yellow-700/40"
  },
  "VIP": {
    name: "VIP",
    icon: <Sparkles className="h-8 w-8" />,
    gradient: "from-purple-600/50 via-fuchsia-500/40 to-purple-600/50",
    borderColor: "border-purple-500/60",
    glowColor: "shadow-[0_0_40px_rgba(168,85,247,0.5)]",
    textColor: "text-purple-400",
    bgPattern: "bg-gradient-to-br from-purple-900/70 to-fuchsia-900/50",
    premium: true
  },
  "I-SMART VIP": {
    name: "I-SMART VIP",
    icon: <Crown className="h-10 w-10" />,
    gradient: "from-cyan-400/50 via-blue-500/40 to-purple-600/50",
    borderColor: "border-cyan-400/70",
    glowColor: "shadow-[0_0_50px_rgba(34,211,238,0.6)]",
    textColor: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400",
    bgPattern: "bg-gradient-to-br from-slate-900/90 via-blue-950/80 to-purple-950/90",
    premium: true
  }
}

export function BadgeCard() {
  const { badge, loading } = useUserBadge()
  
  if (loading) {
    return (
      <Skeleton className="w-full h-48 rounded-3xl" />
    )
  }

  const config = badgeConfigs[badge || "None"] || badgeConfigs["None"]
  
  return (
    <div className="relative w-full">
      {/* Main Badge Card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl p-6 transition-all duration-500",
          "border-2 backdrop-blur-xl",
          config.bgPattern,
          config.borderColor,
          config.glowColor,
          "hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        {/* Animated gradient overlay */}
        <div 
          className={cn(
            "absolute inset-0 opacity-60",
            "bg-gradient-to-br",
            config.gradient
          )}
          style={{
            animation: "gradient-shift 8s ease infinite",
            backgroundSize: "200% 200%"
          }}
        />

        {/* Metallic shine effect for premium badges */}
        {config.premium && (
          <>
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                background: "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.2) 50%, transparent 75%)",
                backgroundSize: "200% 100%",
                animation: "metallic-shine 3s ease-in-out infinite"
              }}
            />
            {/* Sparkle particles */}
            <div className="absolute top-4 right-6 animate-pulse">
              <Sparkles className="h-4 w-4 text-white/60" />
            </div>
            <div className="absolute bottom-6 left-8 animate-pulse delay-300">
              <Sparkles className="h-3 w-3 text-white/40" />
            </div>
          </>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Badge Icon */}
          <div className={cn(
            "mb-4 w-fit p-4 rounded-2xl",
            "bg-black/20 backdrop-blur-sm border border-white/10",
            config.textColor
          )}>
            {config.icon}
          </div>

          {/* Badge Name */}
          <div className="mb-2">
            <h3 className={cn(
              "font-heading font-bold text-2xl tracking-wide",
              config.textColor
            )}>
              {config.name}
            </h3>
            <p className="text-xs text-muted-foreground/70 uppercase tracking-widest mt-1">
              Current Rank
            </p>
          </div>

          {/* Badge Description */}
          <p className="text-sm text-foreground/70 leading-relaxed max-w-xs">
            {badge === "I-SMART VIP" && "Elite member with exclusive benefits and premium features"}
            {badge === "VIP" && "Premium member with enhanced privileges"}
            {badge === "Gold" && "Top-tier member with advanced benefits"}
            {badge === "Silver" && "Valued member with special perks"}
            {badge === "Bronze" && "Active member building rewards"}
            {!badge || badge === "None" && "Start your journey to unlock rewards"}
          </p>

          {/* Premium Badge Indicator */}
          {config.premium && (
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 w-fit">
              <Crown className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                Premium Tier
              </span>
            </div>
          )}
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <div className={cn(
            "absolute top-0 right-0 w-full h-full rounded-bl-full",
            "bg-gradient-to-bl",
            config.gradient
          )} />
        </div>
        <div className="absolute bottom-0 left-0 w-24 h-24 opacity-20">
          <div className={cn(
            "absolute bottom-0 left-0 w-full h-full rounded-tr-full",
            "bg-gradient-to-tr",
            config.gradient
          )} />
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes metallic-shine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  )
}

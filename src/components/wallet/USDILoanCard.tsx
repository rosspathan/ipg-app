import { Lock, Unlock, TrendingUp, ArrowRight, Coins, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

interface USDILoanCardProps {
  className?: string
}

/**
 * Premium USDI Collateral Loan Card — World-class Web3 financial product card
 * Navigates to /app/wallet/loan for collateral-based USDI loans
 * Users lock 200% BSK collateral → receive 100% USDI
 */
export function USDILoanCard({ className }: USDILoanCardProps) {
  const navigate = useNavigate()

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        onClick={() => navigate("/app/wallet/loan")}
        className={`
          relative overflow-hidden cursor-pointer group
          bg-gradient-to-br from-primary/20 via-card/90 to-accent/12
          border border-primary/30 hover:border-primary/50
          transition-all duration-300 hover:shadow-elevated
          hover:-translate-y-0.5
          ${className}
        `}
      >
        {/* Top rim light — cyan → indigo → transparent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-accent/30 pointer-events-none" />

        {/* Animated glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-accent/15 to-transparent rounded-bl-full pointer-events-none" />

        {/* Bottom depth fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card/40 to-transparent pointer-events-none" />

        <CardContent className="relative p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Icon Container with glow ring */}
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/25 shadow-[0_0_16px_hsl(var(--primary)/0.25)]">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                {/* Glow ring pulse */}
                <div className="absolute -inset-1.5 rounded-[14px] border border-primary/20 animate-pulse opacity-60" style={{ animationDuration: '3s' }} />
              </div>
              
              <div>
                <h3 className="font-bold text-lg text-foreground">USDI Loan</h3>
                <p className="text-xs text-muted-foreground">Collateral-backed crypto loan</p>
              </div>
            </div>

            {/* Status Badge */}
            <Badge 
              variant="outline" 
              className="bg-success/10 text-success border-success/30 text-[10px] px-2 py-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse shadow-[0_0_4px_hsl(var(--success)/0.6)]" />
              Active
            </Badge>
          </div>

          {/* Feature Pills — distinct accent styling per tag */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">200% Collateral</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/25">
              <TrendingUp className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs font-semibold text-warning">2% Fee</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/25">
              <Unlock className="w-3.5 h-3.5 text-success" />
              <span className="text-xs font-semibold text-success">Unlock Anytime</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Lock your BSK as collateral and receive instant USDI. 
            Unlock and close your loan whenever you want.
          </p>

          {/* CTA Row */}
          <div className="flex items-center justify-between pt-2 border-t border-primary/10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Lock BSK</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-bold text-accent">Get USDI</span>
            </div>
            
            <div className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform duration-200">
              <span className="text-sm font-bold">Apply Now</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

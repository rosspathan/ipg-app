import { Lock, Unlock, TrendingUp, ArrowRight, Coins } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

interface USDILoanCardProps {
  className?: string
}

/**
 * Premium USDI Collateral Loan Card
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
          bg-gradient-to-br from-primary/15 via-card/90 to-accent/10
          border border-primary/30 hover:border-primary/50
          transition-all duration-300 hover:shadow-lg hover:shadow-primary/20
          ${className}
        `}
      >
        {/* Subtle animated glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/20 to-transparent rounded-bl-full" />

        <CardContent className="relative p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Icon Container */}
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/20">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                {/* Pulse effect */}
                <div className="absolute -inset-1 bg-primary/20 rounded-xl animate-pulse opacity-50" style={{ animationDuration: '3s' }} />
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
              <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
              Active
            </Badge>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">200% Collateral</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <TrendingUp className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-medium">2% Fee</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <Unlock className="w-3.5 h-3.5 text-success" />
              <span className="text-xs font-medium">Unlock Anytime</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Lock your BSK as collateral and receive instant USDI. 
            Unlock and close your loan whenever you want.
          </p>

          {/* CTA Row */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Lock BSK</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-semibold text-accent">Get USDI</span>
            </div>
            
            <div className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform duration-200">
              <span className="text-sm font-semibold">Apply Now</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

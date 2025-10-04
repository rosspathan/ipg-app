import * as React from "react"
import { useState } from "react"
import { X, Download, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface RewardsBreakdownProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * RewardsBreakdown - Bottom sheet with Sources / Timeline / Rules tabs
 */
export function RewardsBreakdown({ isOpen, onClose }: RewardsBreakdownProps) {
  const [activeTab, setActiveTab] = useState("sources")

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-[220ms]"
        onClick={onClose}
        data-testid="rewards-breakdown-backdrop"
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "max-h-[85vh] rounded-t-3xl",
          "bg-card/98 backdrop-blur-2xl border-t border-border/40",
          "transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "overflow-hidden flex flex-col"
        )}
        style={{
          WebkitBackdropFilter: 'blur(32px)',
          backdropFilter: 'blur(32px)',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.4)'
        }}
        data-testid="rewards-breakdown"
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-border/50 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="font-[Space_Grotesk] font-bold text-lg text-foreground">
            Rewards Breakdown
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-muted/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b border-border/30 bg-transparent h-12 px-4">
            <TabsTrigger value="sources" className="flex-1">Sources</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            <TabsTrigger value="rules" className="flex-1">Rules</TabsTrigger>
          </TabsList>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Sources Tab */}
            <TabsContent value="sources" className="mt-0 space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Ad Mining", amount: 45000, percent: 36, color: "bg-success" },
                  { label: "Referral Rewards", amount: 32000, percent: 26, color: "bg-primary" },
                  { label: "Spin Wheel", amount: 18000, percent: 14, color: "bg-accent" },
                  { label: "Lucky Draw", amount: 15000, percent: 12, color: "bg-warning" },
                  { label: "One-time Purchase", amount: 10000, percent: 8, color: "bg-danger" },
                  { label: "Other", amount: 5000, percent: 4, color: "bg-muted" }
                ].map((source, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", source.color)} />
                        <span className="font-[Inter] text-sm text-foreground">{source.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-[Space_Grotesk] font-bold text-sm text-foreground tabular-nums">
                          {(source.amount / 1000).toFixed(1)}K BSK
                        </span>
                        <span className="font-[Inter] text-xs text-muted-foreground">
                          {source.percent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full", source.color)}
                        style={{ width: `${source.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0 space-y-4">
              <div className="space-y-2">
                {[
                  { date: "Today", amount: 150, time: "2h ago" },
                  { date: "Yesterday", amount: 320, time: "1d ago" },
                  { date: "2 days ago", amount: 280, time: "2d ago" },
                  { date: "3 days ago", amount: 410, time: "3d ago" },
                  { date: "4 days ago", amount: 195, time: "4d ago" },
                  { date: "5 days ago", amount: 275, time: "5d ago" },
                  { date: "6 days ago", amount: 340, time: "6d ago" }
                ].map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/30"
                  >
                    <div>
                      <div className="font-[Inter] text-sm text-foreground font-medium">
                        {day.date}
                      </div>
                      <div className="font-[Inter] text-xs text-muted-foreground">
                        {day.time}
                      </div>
                    </div>
                    <div className="font-[Space_Grotesk] font-bold text-success tabular-nums">
                      +{day.amount} BSK
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules" className="mt-0 space-y-4">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-[Inter] text-sm text-foreground font-medium">
                        BSK Withdrawable
                      </p>
                      <p className="font-[Inter] text-xs text-muted-foreground">
                        Tradable balance that can be transferred to other users or withdrawn to your bank account. Available for trading immediately.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-[Inter] text-sm text-foreground font-medium">
                        BSK Holding (Locked)
                      </p>
                      <p className="font-[Inter] text-xs text-muted-foreground">
                        Locked promotional balance that cannot be withdrawn or transferred. These tokens are earned through promotional activities and rewards programs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-[Inter] text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Conversion Rules
                  </p>
                  <ul className="space-y-1.5 font-[Inter] text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Current rate: 1 BSK = ₹0.10 (admin-set, subject to change)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Withdrawal fee: 2.5% (minimum ₹10)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Transfer fee: 1% (minimum ₹5)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Locked BSK may become withdrawable based on vesting schedule</span>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  )
}

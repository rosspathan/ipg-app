import * as React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramGrid } from "@/components/programs-pro/ProgramGrid"
import { ProgramTileUltra } from "@/components/programs-pro/ProgramTileUltra"
import { Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLuckyDrawPools } from "@/hooks/useLuckyDrawPools"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LuckyDrawPage() {
  const navigate = useNavigate()
  const { pools, userTickets, loading, purchaseTickets } = useLuckyDrawPools()
  const [selectedPool, setSelectedPool] = useState<string | null>(null)
  const [ticketCount, setTicketCount] = useState(1)
  const [purchasing, setPurchasing] = useState(false)
  const { toast } = useToast()

  const handlePurchase = async () => {
    if (!selectedPool) return

    setPurchasing(true)
    try {
      await purchaseTickets(selectedPool, ticketCount)
      
      toast({
        title: "Tickets Purchased! 🎫",
        description: `Successfully bought ${ticketCount} ticket(s)`,
      })
      
      setSelectedPool(null)
      setTicketCount(1)
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message || "Could not purchase tickets",
        variant: "destructive"
      })
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <ProgramPageTemplate title="Lucky Draw" subtitle="Loading pools...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ProgramPageTemplate>
    )
  }

  const mappedPools = pools.map(pool => {
    const progress = (pool.current_participants / pool.pool_size) * 100
    const userTicketCount = userTickets[pool.id] || 0
    const status = pool.status
    const isFull = status !== 'active' || progress >= 100

    return {
      id: pool.id,
      title: pool.title,
      subtitle: pool.subtitle,
      icon: <Target className="h-5 w-5" />,
      badge: isFull ? undefined : (progress > 50 ? 'HOT' as const : 'LIVE' as const),
      progress: { 
        value: progress, 
        label: `${pool.current_participants}/${pool.pool_size}` 
      },
      footer: `Prize: ${pool.prizes.first_place.toLocaleString()} BSK${userTicketCount > 0 ? ` • You: ${userTicketCount}` : ''}`,
      onPress: isFull ? undefined : () => setSelectedPool(pool.id)
    }
  })

  return (
    <ProgramPageTemplate
      title="Lucky Draw"
      subtitle="Enter pools and win BSK prizes"
      headerActions={
        <Button size="sm" variant="outline" onClick={() => navigate('/app/programs/lucky-draw/tickets')}>
          My Tickets
        </Button>
      }
    >
      <div className="space-y-6" data-testid="draws-grid">
        <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
          <p className="text-sm text-muted-foreground">
            Buy tickets to enter pools. Winners drawn when pools fill up!
          </p>
        </div>

        <ProgramGrid>
          {mappedPools.map((pool) => (
            <ProgramTileUltra key={pool.id} {...pool} />
          ))}
        </ProgramGrid>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={!!selectedPool} onOpenChange={() => setSelectedPool(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Tickets</DialogTitle>
            <DialogDescription>
              How many tickets would you like to buy?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Number of Tickets</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={ticketCount}
                onChange={(e) => setTicketCount(Number(e.target.value))}
              />
            </div>
            <Button 
              onClick={handlePurchase} 
              disabled={purchasing}
              className="w-full"
            >
              {purchasing ? 'Processing...' : `Buy ${ticketCount} Ticket(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProgramPageTemplate>
  )
}

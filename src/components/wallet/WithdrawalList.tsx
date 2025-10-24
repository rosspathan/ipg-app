import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useAuthUser } from "@/hooks/useAuthUser"
import AssetLogo from "@/components/AssetLogo"

interface Withdrawal {
  id: string
  amount: number
  fee: number
  recipient_address: string
  status: string
  created_at: string
  asset: {
    symbol: string
    name: string
    logo_url: string | null
  }
}

export function WithdrawalList() {
  const { user } = useAuthUser()
  const navigate = useNavigate()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchWithdrawals = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("withdrawals")
          .select(`
            id,
            amount,
            fee,
            recipient_address,
            status,
            created_at,
            assets (
              symbol,
              name,
              logo_url
            )
          `)
          .eq("user_id", user.id)
          .in("status", ["pending", "processing"])
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) throw error

        // Type assertion to match our interface
        const mappedData = (data || []).map((item: any) => ({
          id: item.id,
          amount: item.amount,
          fee: item.fee,
          recipient_address: item.recipient_address,
          status: item.status,
          created_at: item.created_at,
          asset: {
            symbol: item.assets.symbol,
            name: item.assets.name,
            logo_url: item.assets.logo_url,
          },
        }))

        setWithdrawals(mappedData)
      } catch (error) {
        console.error("Error fetching withdrawals:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWithdrawals()

    // Set up real-time subscription
    const channel = supabase
      .channel("withdrawal-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawals",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchWithdrawals()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  if (loading) return null
  if (withdrawals.length === 0) return null

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="h-4 w-4" />,
          color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
          label: "Pending",
        }
      case "processing":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
          label: "Processing",
        }
      case "completed":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: "bg-green-500/10 text-green-600 border-green-500/20",
          label: "Completed",
        }
      case "rejected":
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: "bg-red-500/10 text-red-600 border-red-500/20",
          label: "Rejected",
        }
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
          label: status,
        }
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pending Withdrawals</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/wallet")}
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {withdrawals.map((withdrawal) => {
            const statusConfig = getStatusConfig(withdrawal.status)
            return (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AssetLogo
                    symbol={withdrawal.asset.symbol}
                    logoUrl={withdrawal.asset.logo_url}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold">
                      {withdrawal.amount.toFixed(6)} {withdrawal.asset.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      To: {truncateAddress(withdrawal.recipient_address)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className={statusConfig.color}>
                  {statusConfig.icon}
                  <span className="ml-1">{statusConfig.label}</span>
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

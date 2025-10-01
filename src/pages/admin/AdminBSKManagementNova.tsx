import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, TrendingUp, Settings, Users, DollarSign, RefreshCw } from "lucide-react"
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive"
import { KPIStat } from "@/components/admin/nova/KPIStat"
import { useToast } from "@/hooks/use-toast"

/**
 * AdminBSKManagementNova - BSK system admin page
 * Phase 3: Admin Nova completion
 * Manage BSK rates, view ledgers, configure bonus campaigns
 */
export default function AdminBSKManagementNova() {
  const { toast } = useToast()
  const [currentRate, setCurrentRate] = useState("1.00")
  const [loading, setLoading] = useState(false)

  const handleUpdateRate = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast({
      title: "Rate Updated",
      description: `BSK rate set to ₹${currentRate} per BSK`
    })
    setLoading(false)
  }

  const mockLedgerData = [
    { id: "1", user: "user@example.com", type: "Ad Mining", amount: "+15.50 BSK", balance: "245.30 BSK", date: "2025-10-01 10:30" },
    { id: "2", user: "test@example.com", type: "Bonus Purchase", amount: "+1000.00 BSK", balance: "1000.00 BSK", date: "2025-10-01 09:15" },
    { id: "3", user: "demo@example.com", type: "Subscription", amount: "-50.00 BSK", balance: "450.00 BSK", date: "2025-09-30 16:45" }
  ]

  const mockBalanceData = [
    { id: "1", user: "user@example.com", withdrawable: "145.30 BSK", holding: "100.00 BSK", lifetime: "245.30 BSK" },
    { id: "2", user: "test@example.com", withdrawable: "800.00 BSK", holding: "200.00 BSK", lifetime: "1000.00 BSK" },
    { id: "3", user: "demo@example.com", withdrawable: "350.00 BSK", holding: "100.00 BSK", lifetime: "450.00 BSK" }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          BSK Management
        </h1>
        <p className="text-muted-foreground">
          Manage BSK rates, ledgers, and bonus campaigns
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPIStat
          icon={<DollarSign className="h-5 w-5" />}
          label="Current Rate"
          value="₹1.00 / BSK"
          variant="default"
        />
        <KPIStat
          icon={<Users className="h-5 w-5" />}
          label="Active Users"
          value="1,234"
          delta={{ value: 12, trend: "up" }}
          variant="success"
        />
        <KPIStat
          icon={<Wallet className="h-5 w-5" />}
          label="Total Supply"
          value="2.5M BSK"
          delta={{ value: 5, trend: "up" }}
          variant="warning"
        />
        <KPIStat
          icon={<TrendingUp className="h-5 w-5" />}
          label="24h Volume"
          value="₹125K"
          delta={{ value: 8, trend: "up" }}
          variant="success"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="rate" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rate">
            <Settings className="h-4 w-4 mr-2" />
            Rate
          </TabsTrigger>
          <TabsTrigger value="ledgers">
            <RefreshCw className="h-4 w-4 mr-2" />
            Ledgers
          </TabsTrigger>
          <TabsTrigger value="balances">
            <Wallet className="h-4 w-4 mr-2" />
            Balances
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <TrendingUp className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BSK Exchange Rate</CardTitle>
              <CardDescription>
                Set the BSK to INR conversion rate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Rate (INR per BSK)</Label>
                <div className="flex gap-2">
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={currentRate}
                    onChange={(e) => setCurrentRate(e.target.value)}
                    placeholder="1.00"
                  />
                  <Button onClick={handleUpdateRate} disabled={loading}>
                    {loading ? "Updating..." : "Update Rate"}
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  This rate is used for all BSK conversions including ad mining rewards, 
                  subscription payments, and bonus calculations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledgers">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Ledgers</CardTitle>
              <CardDescription>View all BSK transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <DataGridAdaptive
                data={mockLedgerData}
                keyExtractor={(row) => row.id}
                columns={[
                  { key: "user", label: "User" },
                  { key: "type", label: "Type" },
                  { key: "amount", label: "Amount" },
                  { key: "balance", label: "Balance After" },
                  { key: "date", label: "Date" }
                ]}
                renderCard={(row) => (
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{row.user}</span>
                      <span className="text-sm text-muted-foreground">{row.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">{row.type}</span>
                      <span className="font-semibold">{row.amount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Balance: {row.balance}</div>
                  </div>
                )}
                onRowClick={(row) => console.log("View ledger entry:", row)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>User BSK Balances</CardTitle>
              <CardDescription>Overview of all user balances</CardDescription>
            </CardHeader>
            <CardContent>
              <DataGridAdaptive
                data={mockBalanceData}
                keyExtractor={(row) => row.id}
                columns={[
                  { key: "user", label: "User" },
                  { key: "withdrawable", label: "Withdrawable" },
                  { key: "holding", label: "Holding" },
                  { key: "lifetime", label: "Lifetime Earned" }
                ]}
                renderCard={(row) => (
                  <div className="p-4 space-y-2">
                    <div className="font-medium">{row.user}</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Withdrawable</div>
                        <div className="font-semibold">{row.withdrawable}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Holding</div>
                        <div className="font-semibold">{row.holding}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Lifetime</div>
                        <div className="font-semibold">{row.lifetime}</div>
                      </div>
                    </div>
                  </div>
                )}
                onRowClick={(row) => console.log("View user balance:", row)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Bonus Campaigns</CardTitle>
              <CardDescription>Manage BSK bonus and promotion campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active campaigns</p>
                <Button variant="outline" className="mt-4">
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useStakingManagement } from "@/hooks/useStakingManagement";
import { Loader2, Plus, Pause, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StakingControlPanel() {
  const { pools, stakes, isLoading, createPool, updatePool, deletePool } = useStakingManagement();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    apy_percent: 10,
    lock_period_days: null as number | null,
    min_stake_amount: 100,
    max_stake_amount: null as number | null,
    pool_capacity: null as number | null
  });

  const handleSubmit = () => {
    createPool(formData);
    setIsCreateOpen(false);
    setFormData({
      name: "",
      apy_percent: 10,
      lock_period_days: null,
      min_stake_amount: 100,
      max_stake_amount: null,
      pool_capacity: null
    });
  };

  const totalStaked = pools.reduce((sum, p) => sum + Number(p.total_staked), 0);
  const activeStakes = stakes.filter((s: any) => s.status === 'active').length;

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Staking Control Panel</h1>
          <p className="text-muted-foreground">Manage staking pools and monitor active stakes</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Create Pool</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Staking Pool</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Pool Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Flexible BSK Staking" />
              </div>
              <div>
                <Label>APY (%)</Label>
                <Input type="number" value={formData.apy_percent} onChange={(e) => setFormData({ ...formData, apy_percent: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Lock Period (days, optional)</Label>
                <Input type="number" value={formData.lock_period_days || ""} onChange={(e) => setFormData({ ...formData, lock_period_days: e.target.value ? Number(e.target.value) : null })} placeholder="Leave empty for flexible" />
              </div>
              <div>
                <Label>Min Stake Amount (BSK)</Label>
                <Input type="number" value={formData.min_stake_amount} onChange={(e) => setFormData({ ...formData, min_stake_amount: Number(e.target.value) })} />
              </div>
              <Button onClick={handleSubmit} className="w-full">Create Pool</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total Value Locked</div>
          <div className="text-2xl font-bold">{totalStaked.toFixed(2)} BSK</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Active Pools</div>
          <div className="text-2xl font-bold">{pools.filter(p => p.status === 'active').length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Active Stakes</div>
          <div className="text-2xl font-bold">{activeStakes}</div>
        </Card>
      </div>

      <Tabs defaultValue="pools">
        <TabsList>
          <TabsTrigger value="pools">Pools</TabsTrigger>
          <TabsTrigger value="stakes">Active Stakes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pools" className="space-y-4">
          {pools.map((pool) => (
            <Card key={pool.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{pool.name}</h3>
                    <Badge variant={pool.status === 'active' ? 'default' : 'secondary'}>{pool.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">APY:</span> <span className="font-semibold">{pool.apy_percent}%</span></div>
                    <div><span className="text-muted-foreground">Lock Period:</span> <span className="font-semibold">{pool.lock_period_days ? `${pool.lock_period_days} days` : 'Flexible'}</span></div>
                    <div><span className="text-muted-foreground">Total Staked:</span> <span className="font-semibold">{Number(pool.total_staked).toFixed(2)} BSK</span></div>
                    <div><span className="text-muted-foreground">Min Stake:</span> <span className="font-semibold">{pool.min_stake_amount} BSK</span></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updatePool({ id: pool.id, status: pool.status === 'active' ? 'paused' : 'active' })}>
                    {pool.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deletePool(pool.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="stakes">
          <Card className="p-6">
            <div className="space-y-4">
              {stakes.map((stake: any) => (
                <div key={stake.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <div className="font-semibold">{stake.user?.username || 'Unknown User'}</div>
                    <div className="text-sm text-muted-foreground">{stake.pool?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{Number(stake.amount).toFixed(2)} BSK</div>
                    <div className="text-sm text-muted-foreground">Started {new Date(stake.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Staking Analytics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average APY</span>
                <span className="font-semibold">{pools.length ? (pools.reduce((sum, p) => sum + p.apy_percent, 0) / pools.length).toFixed(2) : 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pool Utilization</span>
                <span className="font-semibold">{pools.filter(p => Number(p.total_staked) > 0).length}/{pools.length}</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

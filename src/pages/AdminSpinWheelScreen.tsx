import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { ArrowLeft, Settings, Users, BarChart3, Shield, Plus, Edit2, Trash2, Coins } from 'lucide-react'

interface WheelConfig {
  id: string
  name: string
  is_active: boolean
  min_bet_usdt: number
  max_bet_usdt: number
  fee_percentage: number
  free_spins_per_user: number
  house_edge_percentage: number
  target_rtp_percentage: number
  daily_spin_limit: number | null
  created_at: string
  updated_at: string
}

interface WheelSegment {
  id: number
  label: string
  weight: number
  min_payout: number
  max_payout: number
  payout_token: string
  payout_type: string
  color_hex: string
  is_active: boolean
  daily_win_limit: number | null
  total_win_limit: number | null
}

interface AdminStats {
  wheel_name: string
  spins_today: number
  free_spins_today: number
  fees_collected_today: number
  total_payouts_today: number
  total_losses_today: number
  active_segments: number
}

export default function AdminSpinWheelScreen() {
  const navigate = useNavigate()
  
  const [config, setConfig] = useState<WheelConfig | null>(null)
  const [segments, setSegments] = useState<WheelSegment[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingSegment, setEditingSegment] = useState<WheelSegment | null>(null)
  const [newSegment, setNewSegment] = useState<Partial<WheelSegment>>({
    label: '',
    weight: 10,
    min_payout: 0,
    max_payout: 0,
    payout_token: 'BSK',
    payout_type: 'fixed',
    color_hex: '#00ff88',
    is_active: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load wheel configuration
      const { data: configData, error: configError } = await supabase
        .from('spin_wheel_config')
        .select('*')
        .eq('is_active', true)
        .single()

      if (configError) throw configError
      setConfig(configData)

      // Load segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('spin_wheel_segments')
        .select('*')
        .order('id')

      if (segmentsError) throw segmentsError
      setSegments(segmentsData || [])

      // Load admin stats
      const { data: statsData, error: statsError } = await supabase
        .from('admin_spin_wheel_stats')
        .select('*')
        .single()

      if (statsError) {
        console.warn('Stats not available:', statsError)
      } else {
        setStats(statsData)
      }

    } catch (error: any) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load spin wheel data', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (updates: Partial<WheelConfig>) => {
    if (!config) return

    try {
      const { error } = await supabase
        .from('spin_wheel_config')
        .update(updates)
        .eq('id', config.id)

      if (error) throw error

      setConfig({ ...config, ...updates })
      toast.success('Configuration updated successfully')
    } catch (error: any) {
      toast.error('Failed to update configuration', { description: error.message })
    }
  }

  const createSegment = async () => {
    if (!newSegment.label || !newSegment.weight) {
      toast.error('Please fill required fields')
      return
    }

    try {
      const segmentToInsert = {
        label: newSegment.label!,
        weight: newSegment.weight!,
        min_payout: newSegment.min_payout!,
        max_payout: newSegment.max_payout!,
        payout_token: newSegment.payout_token!,
        payout_type: newSegment.payout_type!,
        color_hex: newSegment.color_hex!,
        is_active: newSegment.is_active!
      }
      
      const { error } = await supabase
        .from('spin_wheel_segments')
        .insert(segmentToInsert)

      if (error) throw error

      toast.success('Segment created successfully')
      setNewSegment({
        label: '',
        weight: 10,
        min_payout: 0,
        max_payout: 0,
        payout_token: 'BSK',
        payout_type: 'fixed',
        color_hex: '#00ff88',
        is_active: true
      })
      loadData()
    } catch (error: any) {
      toast.error('Failed to create segment', { description: error.message })
    }
  }

  const updateSegment = async (segment: WheelSegment) => {
    try {
      const { error } = await supabase
        .from('spin_wheel_segments')
        .update(segment)
        .eq('id', segment.id)

      if (error) throw error

      toast.success('Segment updated successfully')
      setEditingSegment(null)
      loadData()
    } catch (error: any) {
      toast.error('Failed to update segment', { description: error.message })
    }
  }

  const toggleSegment = async (segmentId: number, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('spin_wheel_segments')
        .update({ is_active: isActive })
        .eq('id', segmentId)

      if (error) throw error

      toast.success(`Segment ${isActive ? 'enabled' : 'disabled'}`)
      loadData()
    } catch (error: any) {
      toast.error('Failed to toggle segment', { description: error.message })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading spin wheel admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Admin Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-500" />
            Spin Wheel Admin
          </h1>
          <p className="text-muted-foreground">Manage provably fair spin wheel configuration</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Today's Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Spins</span>
                    <span className="font-medium">{stats?.spins_today || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Free Spins</span>
                    <span className="font-medium">{stats?.free_spins_today || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Paid Spins</span>
                    <span className="font-medium">{(stats?.spins_today || 0) - (stats?.free_spins_today || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Revenue & Payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fees Collected</span>
                    <span className="font-medium text-green-600">{stats?.fees_collected_today || 0} BSK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Payouts</span>
                    <span className="font-medium text-blue-600">{stats?.total_payouts_today || 0} BSK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Net P&L</span>
                    <span className={`font-medium ${((stats?.fees_collected_today || 0) - (stats?.total_payouts_today || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {((stats?.fees_collected_today || 0) - (stats?.total_payouts_today || 0)).toFixed(2)} BSK
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Segments</span>
                    <span className="font-medium">{stats?.active_segments || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fee Rate</span>
                    <span className="font-medium">{config?.fee_percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Target RTP</span>
                    <span className="font-medium">{config?.target_rtp_percentage || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          {config && (
            <Card>
              <CardHeader>
                <CardTitle>Wheel Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Wheel Name</Label>
                    <Input
                      id="name"
                      value={config.name}
                      onChange={(e) => setConfig({...config, name: e.target.value})}
                      onBlur={() => updateConfig({ name: config.name })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="free_spins">Free Spins Per User</Label>
                    <Input
                      id="free_spins"
                      type="number"
                      value={config.free_spins_per_user}
                      onChange={(e) => setConfig({...config, free_spins_per_user: parseInt(e.target.value)})}
                      onBlur={() => updateConfig({ free_spins_per_user: config.free_spins_per_user })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="min_bet">Min Bet (USDT)</Label>
                    <Input
                      id="min_bet"
                      type="number"
                      step="0.01"
                      value={config.min_bet_usdt}
                      onChange={(e) => setConfig({...config, min_bet_usdt: parseFloat(e.target.value)})}
                      onBlur={() => updateConfig({ min_bet_usdt: config.min_bet_usdt })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="max_bet">Max Bet (USDT)</Label>
                    <Input
                      id="max_bet"
                      type="number"
                      step="0.01"
                      value={config.max_bet_usdt}
                      onChange={(e) => setConfig({...config, max_bet_usdt: parseFloat(e.target.value)})}
                      onBlur={() => updateConfig({ max_bet_usdt: config.max_bet_usdt })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fee_percentage">Fee Percentage (%)</Label>
                    <Input
                      id="fee_percentage"
                      type="number"
                      step="0.1"
                      value={config.fee_percentage}
                      onChange={(e) => setConfig({...config, fee_percentage: parseFloat(e.target.value)})}
                      onBlur={() => updateConfig({ fee_percentage: config.fee_percentage })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="house_edge">House Edge (%)</Label>
                    <Input
                      id="house_edge"
                      type="number"
                      step="0.1"
                      value={config.house_edge_percentage}
                      onChange={(e) => setConfig({...config, house_edge_percentage: parseFloat(e.target.value)})}
                      onBlur={() => updateConfig({ house_edge_percentage: config.house_edge_percentage })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="target_rtp">Target RTP (%)</Label>
                    <Input
                      id="target_rtp"
                      type="number"
                      step="0.1"
                      value={config.target_rtp_percentage}
                      onChange={(e) => setConfig({...config, target_rtp_percentage: parseFloat(e.target.value)})}
                      onBlur={() => updateConfig({ target_rtp_percentage: config.target_rtp_percentage })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="daily_limit">Daily Spin Limit</Label>
                    <Input
                      id="daily_limit"
                      type="number"
                      value={config.daily_spin_limit || ''}
                      placeholder="No limit"
                      onChange={(e) => setConfig({...config, daily_spin_limit: e.target.value ? parseInt(e.target.value) : null})}
                      onBlur={() => updateConfig({ daily_spin_limit: config.daily_spin_limit })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={config.is_active}
                    onCheckedChange={(checked) => updateConfig({ is_active: checked })}
                  />
                  <Label htmlFor="is_active">Wheel Active</Label>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          {/* Add New Segment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Segment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="new_label">Label</Label>
                  <Input
                    id="new_label"
                    value={newSegment.label}
                    onChange={(e) => setNewSegment({...newSegment, label: e.target.value})}
                    placeholder="WIN 5 BSK"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new_weight">Weight</Label>
                  <Input
                    id="new_weight"
                    type="number"
                    value={newSegment.weight}
                    onChange={(e) => setNewSegment({...newSegment, weight: parseInt(e.target.value)})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="new_payout">Payout Amount</Label>
                  <Input
                    id="new_payout"
                    type="number"
                    step="0.01"
                    value={newSegment.min_payout}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      setNewSegment({...newSegment, min_payout: value, max_payout: value})
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="new_token">Token</Label>
                  <select
                    id="new_token"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={newSegment.payout_token}
                    onChange={(e) => setNewSegment({...newSegment, payout_token: e.target.value})}
                  >
                    <option value="BSK">BSK</option>
                    <option value="IPG">IPG</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="new_color">Color</Label>
                  <Input
                    id="new_color"
                    type="color"
                    value={newSegment.color_hex}
                    onChange={(e) => setNewSegment({...newSegment, color_hex: e.target.value})}
                  />
                </div>
              </div>
              
              <Button onClick={createSegment} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Segment
              </Button>
            </CardContent>
          </Card>

          {/* Segments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Wheel Segments</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total Weight: {segments.filter(s => s.is_active).reduce((sum, s) => sum + s.weight, 0)}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((segment) => (
                    <TableRow key={segment.id}>
                      <TableCell>{segment.label}</TableCell>
                      <TableCell>{segment.weight}</TableCell>
                      <TableCell>
                        {segment.min_payout === segment.max_payout 
                          ? segment.min_payout 
                          : `${segment.min_payout}-${segment.max_payout}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={segment.payout_token === 'BSK' ? 'default' : 'secondary'}>
                          {segment.payout_token}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: segment.color_hex }}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={segment.is_active ? 'default' : 'secondary'}>
                          {segment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSegment(segment)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={segment.is_active}
                            onCheckedChange={(checked) => toggleSegment(segment.id, checked)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Configuration options are available in the main settings above.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Audit logs will be displayed here once implemented.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Save, Plus, Trash2 } from 'lucide-react'

export default function AdminSpinWheel() {
  const { toast } = useToast()
  const [config, setConfig] = useState<any>(null)
  const [segments, setSegments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      const { data: configData } = await supabase
        .from('spin_config')
        .select('*')
        .single()

      if (configData) {
        setConfig(configData)
      }

      const { data: segmentsData } = await supabase
        .from('spin_segments')
        .select('*')
        .order('created_at', { ascending: true })

      if (segmentsData) {
        setSegments(segmentsData)
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!config) return

    try {
      setIsSaving(true)

      const { error } = await supabase
        .from('spin_config')
        .update({
          min_bet_bsk: config.min_bet_bsk,
          max_bet_bsk: config.max_bet_bsk,
          post_free_spin_fee_bsk: config.post_free_spin_fee_bsk,
          winner_profit_fee_percent: config.winner_profit_fee_percent,
          free_spins_per_user: config.free_spins_per_user,
          is_active: config.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Spin wheel configuration updated',
      })
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSegment = async (segment: any) => {
    try {
      const { error } = await supabase
        .from('spin_segments')
        .update({
          label: segment.label,
          multiplier: segment.multiplier,
          weight: segment.weight,
          color_hex: segment.color_hex,
          is_active: segment.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', segment.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Segment updated',
      })

      await loadData()
    } catch (error) {
      console.error('Save segment error:', error)
      toast({
        title: 'Error',
        description: 'Failed to save segment',
        variant: 'destructive',
      })
    }
  }

  const handleAddSegment = async () => {
    try {
      const { error } = await supabase
        .from('spin_segments')
        .insert({
          label: 'New Segment',
          multiplier: 0,
          weight: 25,
          color_hex: '#3b82f6',
          is_active: true,
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Segment added',
      })

      await loadData()
    } catch (error) {
      console.error('Add segment error:', error)
      toast({
        title: 'Error',
        description: 'Failed to add segment',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteSegment = async (id: string) => {
    try {
      const { error } = await supabase.from('spin_segments').delete().eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Segment deleted',
      })

      await loadData()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete segment',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Spin Wheel Admin</h1>

      {/* Config Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Bet (BSK)</Label>
              <Input
                type="number"
                value={config?.min_bet_bsk || 100}
                onChange={(e) =>
                  setConfig({ ...config, min_bet_bsk: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Max Bet (BSK)</Label>
              <Input
                type="number"
                value={config?.max_bet_bsk || 1000}
                onChange={(e) =>
                  setConfig({ ...config, max_bet_bsk: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Spin Fee (after free spins, BSK)</Label>
              <Input
                type="number"
                value={config?.post_free_spin_fee_bsk || 10}
                onChange={(e) =>
                  setConfig({ ...config, post_free_spin_fee_bsk: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Winner Profit Fee (%)</Label>
              <Input
                type="number"
                value={config?.winner_profit_fee_percent || 10}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    winner_profit_fee_percent: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Free Spins Per User</Label>
              <Input
                type="number"
                value={config?.free_spins_per_user || 5}
                onChange={(e) =>
                  setConfig({ ...config, free_spins_per_user: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config?.is_active || false}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, is_active: checked })
                  }
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveConfig} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>

      {/* Segments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Segments</CardTitle>
            <Button onClick={handleAddSegment} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Segment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {segments.map((segment) => (
            <div key={segment.id} className="p-4 border rounded-lg space-y-3">
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={segment.label}
                    onChange={(e) => {
                      const updated = segments.map((s) =>
                        s.id === segment.id ? { ...s, label: e.target.value } : s
                      )
                      setSegments(updated)
                    }}
                  />
                </div>
                <div>
                  <Label>Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={segment.multiplier}
                    onChange={(e) => {
                      const updated = segments.map((s) =>
                        s.id === segment.id ? { ...s, multiplier: Number(e.target.value) } : s
                      )
                      setSegments(updated)
                    }}
                  />
                </div>
                <div>
                  <Label>Weight</Label>
                  <Input
                    type="number"
                    value={segment.weight}
                    onChange={(e) => {
                      const updated = segments.map((s) =>
                        s.id === segment.id ? { ...s, weight: Number(e.target.value) } : s
                      )
                      setSegments(updated)
                    }}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={segment.color_hex}
                    onChange={(e) => {
                      const updated = segments.map((s) =>
                        s.id === segment.id ? { ...s, color_hex: e.target.value } : s
                      )
                      setSegments(updated)
                    }}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={segment.is_active}
                      onCheckedChange={(checked) => {
                        const updated = segments.map((s) =>
                          s.id === segment.id ? { ...s, is_active: checked } : s
                        )
                        setSegments(updated)
                      }}
                    />
                    <Label className="text-xs">Active</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSaveSegment(segment)}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteSegment(segment.id)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

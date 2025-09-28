import React from 'react'
import { Settings, Volume2, VolumeX, Smartphone, Zap, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMotionSettings } from '@/hooks/useMotionSettings'

interface MotionSettingsDialogProps {
  trigger?: React.ReactNode
}

export function MotionSettingsDialog({ trigger }: MotionSettingsDialogProps) {
  const { settings, deviceCapabilities, updateSettings } = useMotionSettings()

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Settings className="w-4 h-4 mr-2" />
      Animation Settings
    </Button>
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Animation & Audio Settings
          </DialogTitle>
          <DialogDescription>
            Customize your spin wheel experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Device Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Device Type:</span>
                <Badge variant="outline">
                  {deviceCapabilities.isMobile ? 'Mobile' : 'Desktop'}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>WebGL Support:</span>
                <Badge variant={deviceCapabilities.supportsWebGL ? 'default' : 'secondary'}>
                  {deviceCapabilities.supportsWebGL ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Performance:</span>
                <Badge variant={deviceCapabilities.isLowEnd ? 'secondary' : 'default'}>
                  {deviceCapabilities.isLowEnd ? 'Basic' : 'High-End'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Accessibility */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Accessibility
            </h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Reduced Motion</label>
                <p className="text-xs text-muted-foreground">
                  Simplifies animations for accessibility
                </p>
              </div>
              <Switch
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
              />
            </div>
          </div>

          {/* Audio Settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              Audio & Haptics
            </h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Sound Effects</label>
                <p className="text-xs text-muted-foreground">
                  Spin sounds, ticks, and result audio
                </p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Haptic Feedback</label>
                <p className="text-xs text-muted-foreground">
                  Vibration on mobile devices
                </p>
              </div>
              <Switch
                checked={settings.hapticsEnabled}
                onCheckedChange={(checked) => updateSettings({ hapticsEnabled: checked })}
                disabled={!deviceCapabilities.isMobile}
              />
            </div>
          </div>

          {/* Performance Settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Performance
            </h4>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Particle Quality</label>
              <Select
                value={settings.particleQuality}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  updateSettings({ particleQuality: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Better Performance)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="high">High (Best Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Frame Rate</label>
              <Select
                value={settings.targetFPS.toString()}
                onValueChange={(value) => 
                  updateSettings({ targetFPS: parseInt(value) as 30 | 60 })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 FPS (Battery Saver)</SelectItem>
                  <SelectItem value="60">60 FPS (Smooth)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Auto-Adapt Performance</label>
                <p className="text-xs text-muted-foreground">
                  Automatically adjust based on device capabilities
                </p>
              </div>
              <Switch
                checked={settings.autoAdapt}
                onCheckedChange={(checked) => updateSettings({ autoAdapt: checked })}
              />
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('premium-spin-settings')
                window.location.reload()
              }}
              className="w-full"
            >
              Reset to Default Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
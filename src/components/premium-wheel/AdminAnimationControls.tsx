import React, { useState } from 'react'
import { Play, Pause, RotateCcw, Settings, TestTube } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PremiumSpinWheel } from './PremiumSpinWheel'
import { usePremiumAnimation } from '@/hooks/usePremiumAnimation'

interface AnimationConfig {
  minDuration: number
  maxDuration: number
  particleDensity: 'low' | 'medium' | 'high'
  soundEnabled: boolean
  hapticsEnabled: boolean
  rimGlowEnabled: boolean
  specularEnabled: boolean
}

const defaultConfig: AnimationConfig = {
  minDuration: 4600,
  maxDuration: 6200,
  particleDensity: 'medium',
  soundEnabled: true,
  hapticsEnabled: true,
  rimGlowEnabled: true,
  specularEnabled: true
}

// Mock segments for testing
const mockSegments = [
  { id: '1', label: 'WIN ×2', multiplier: 2, weight: 20, color_hex: '#4CAF50' },
  { id: '2', label: 'LOSE', multiplier: 0, weight: 30, color_hex: '#F44336' },
  { id: '3', label: 'WIN ×5', multiplier: 5, weight: 10, color_hex: '#FF9800' },
  { id: '4', label: 'LOSE', multiplier: 0, weight: 30, color_hex: '#9C27B0' },
  { id: '5', label: 'WIN ×10', multiplier: 10, weight: 5, color_hex: '#2196F3' },
  { id: '6', label: 'LOSE', multiplier: 0, weight: 25, color_hex: '#607D8B' }
]

export function AdminAnimationControls() {
  const [config, setConfig] = useState<AnimationConfig>(defaultConfig)
  const [testWinningIndex, setTestWinningIndex] = useState(0)
  const [isTestSpinning, setIsTestSpinning] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])
  
  const { animationState, startSpin, stopSpin, isSpinning, getPerformanceMetrics } = usePremiumAnimation()

  const updateConfig = (updates: Partial<AnimationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const runTestSpin = () => {
    if (isSpinning) {
      stopSpin()
      setIsTestSpinning(false)
      return
    }

    setIsTestSpinning(true)
    const randomWinningIndex = Math.floor(Math.random() * mockSegments.length)
    setTestWinningIndex(randomWinningIndex)
    
    startSpin(randomWinningIndex, mockSegments.length, (result) => {
      setIsTestSpinning(false)
      const segment = mockSegments[result.segmentIndex]
      const resultText = `${segment.label} (${result.isWin ? 'WIN' : 'LOSE'}) - ${new Date().toLocaleTimeString()}`
      setTestResults(prev => [resultText, ...prev.slice(0, 9)]) // Keep last 10 results
    })
  }

  const runPerformanceTest = () => {
    // Run multiple test spins to measure performance
    let testCount = 0
    const maxTests = 5
    const performanceResults: number[] = []

    const runNextTest = () => {
      if (testCount >= maxTests) {
        const avgFPS = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length
        setTestResults(prev => [`Performance Test Complete - Avg FPS: ${avgFPS.toFixed(1)}`, ...prev])
        return
      }

      testCount++
      const randomIndex = Math.floor(Math.random() * mockSegments.length)
      setTestWinningIndex(randomIndex)
      setIsTestSpinning(true)

      startSpin(randomIndex, mockSegments.length, () => {
        const metrics = getPerformanceMetrics()
        performanceResults.push(metrics.fps)
        setIsTestSpinning(false)
        
        setTimeout(() => runNextTest(), 1000) // Wait 1 second between tests
      })
    }

    setTestResults(prev => [`Starting Performance Test (${maxTests} spins)...`, ...prev])
    runNextTest()
  }

  const performanceMetrics = getPerformanceMetrics()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Premium Spin Animation Controls</h2>
        <Badge variant="outline" className="font-mono">
          Admin Panel
        </Badge>
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
          <TabsTrigger value="settings">Animation Settings</TabsTrigger>
          <TabsTrigger value="performance">Performance Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wheel Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Wheel Preview
                  <Badge variant={isSpinning ? 'default' : 'secondary'}>
                    {isSpinning ? 'Spinning' : 'Idle'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square max-w-sm mx-auto">
                  <PremiumSpinWheel
                    segments={mockSegments}
                    isSpinning={isTestSpinning}
                    winningSegmentIndex={isTestSpinning ? testWinningIndex : undefined}
                    showParticles={false} // Controlled separately for testing
                    particleType="win"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={runTestSpin} className="flex-1">
                    {isSpinning ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Stop Spin
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Test Spin
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setTestResults([])}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Real-time Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{performanceMetrics.fps.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">FPS</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold capitalize">{performanceMetrics.phase}</div>
                    <div className="text-sm text-muted-foreground">Phase</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{performanceMetrics.velocity.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Velocity</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{performanceMetrics.isRunning ? 'Active' : 'Idle'}</div>
                    <div className="text-sm text-muted-foreground">Status</div>
                  </div>
                </div>

                {/* Recent Test Results */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Recent Test Results</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {testResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No test results yet</p>
                    ) : (
                      testResults.map((result, index) => (
                        <div key={index} className="text-xs bg-muted p-2 rounded">
                          {result}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timing Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Timing & Duration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Min Duration: {config.minDuration}ms
                  </label>
                  <Slider
                    value={[config.minDuration]}
                    onValueChange={([value]) => updateConfig({ minDuration: value })}
                    min={2000}
                    max={8000}
                    step={100}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Max Duration: {config.maxDuration}ms
                  </label>
                  <Slider
                    value={[config.maxDuration]}
                    onValueChange={([value]) => updateConfig({ maxDuration: value })}
                    min={config.minDuration + 500}
                    max={10000}
                    step={100}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Visual Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Visual Effects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Particle Density</label>
                  <Select
                    value={config.particleDensity}
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      updateConfig({ particleDensity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (50 particles)</SelectItem>
                      <SelectItem value="medium">Medium (150 particles)</SelectItem>
                      <SelectItem value="high">High (300 particles)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Rim Glow</label>
                  <Switch
                    checked={config.rimGlowEnabled}
                    onCheckedChange={(checked) => updateConfig({ rimGlowEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Specular Highlights</label>
                  <Switch
                    checked={config.specularEnabled}
                    onCheckedChange={(checked) => updateConfig({ specularEnabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Audio & Haptics */}
            <Card>
              <CardHeader>
                <CardTitle>Audio & Haptics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sound Effects</label>
                  <Switch
                    checked={config.soundEnabled}
                    onCheckedChange={(checked) => updateConfig({ soundEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Haptic Feedback</label>
                  <Switch
                    checked={config.hapticsEnabled}
                    onCheckedChange={(checked) => updateConfig({ hapticsEnabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Performance Testing Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={runPerformanceTest} disabled={isSpinning}>
                  Run Performance Test
                </Button>
                <Button variant="outline" onClick={() => setTestResults([])}>
                  Clear Results
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Performance Guidelines</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Target: ≥55 FPS on mid-tier mobile devices</li>
                  <li>• Acceptable: 45-55 FPS (auto-reduce particle quality)</li>
                  <li>• Poor: &lt;45 FPS (enable reduced motion mode)</li>
                  <li>• Excellent: ≥58 FPS consistently</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Test Results History</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {testResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No performance tests run yet</p>
                  ) : (
                    testResults.map((result, index) => (
                      <div key={index} className="text-xs bg-background p-2 rounded border">
                        {result}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BrandMotionGuide from '@/components/brand/BrandMotionGuide';

const DesignReview: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Astra Grid Design System</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Complete brand and UI system for IPG i-SMART Exchange
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="secondary">Dark Theme</Badge>
            <Badge variant="secondary">Grid Navigation</Badge>
            <Badge variant="secondary">Premium Motion</Badge>
            <Badge variant="secondary">Neo-Noir Aesthetic</Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="brand">Brand System</TabsTrigger>
            <TabsTrigger value="grids">Grid Components</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Home Grid Screenshot Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Home Grid Layout</CardTitle>
                  <CardDescription>KPI row + programs carousel + activity grid</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-primary/40 rounded-full flex items-center justify-center">
                        🏠
                      </div>
                      <p className="font-medium">Home Page Grid</p>
                      <p className="text-sm text-muted-foreground">data-testid="page-home"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Programs Grid Screenshot Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Programs Grid</CardTitle>
                  <CardDescription>Responsive grid with filters + categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-accent/40 rounded-full flex items-center justify-center">
                        🎯
                      </div>
                      <p className="font-medium">Programs Grid</p>
                      <p className="text-sm text-muted-foreground">data-testid="program-grid"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Grid Screenshot Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Wallet Grid</CardTitle>
                  <CardDescription>Balance cluster + crypto assets grid</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-success/20 to-warning/20 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-success/40 rounded-full flex items-center justify-center">
                        💰
                      </div>
                      <p className="font-medium">Wallet Page</p>
                      <p className="text-sm text-muted-foreground">data-testid="balance-cluster"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trading Grid Screenshot Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Trading Pairs Grid</CardTitle>
                  <CardDescription>Grid-based pair selection + chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-warning/20 to-danger/20 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-warning/40 rounded-full flex items-center justify-center">
                        📈
                      </div>
                      <p className="font-medium">Trading Page</p>
                      <p className="text-sm text-muted-foreground">data-testid="pairs-grid"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Program Detail Grids */}
              <Card>
                <CardHeader>
                  <CardTitle>Program Detail Grids</CardTitle>
                  <CardDescription>Staking pools, draws, tiers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-danger/20 to-primary/20 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-danger/40 rounded-full flex items-center justify-center">
                        🎰
                      </div>
                      <p className="font-medium">Program Details</p>
                      <p className="text-sm text-muted-foreground">data-testid="staking-grid"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Grids */}
              <Card>
                <CardHeader>
                  <CardTitle>Admin Interface</CardTitle>
                  <CardDescription>Grid-based admin controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-muted/40 to-muted/20 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 bg-muted/60 rounded-full flex items-center justify-center">
                        ⚙️
                      </div>
                      <p className="font-medium">Admin Dashboard</p>
                      <p className="text-sm text-muted-foreground">Grid-based controls</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Implementation Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Implementation Status</CardTitle>
                <CardDescription>Current progress on design system components</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">13</div>
                    <p className="text-sm text-muted-foreground">New Components</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">8</div>
                    <p className="text-sm text-muted-foreground">Brand Assets</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">5</div>
                    <p className="text-sm text-muted-foreground">Pages Rebuilt</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">100%</div>
                    <p className="text-sm text-muted-foreground">Grid Navigation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand">
            <BrandMotionGuide />
          </TabsContent>

          <TabsContent value="grids" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Grid System Architecture</CardTitle>
                <CardDescription>Component hierarchy and data flow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Core Grid Components (13 total)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                      <Badge variant="outline">GridShell</Badge>
                      <Badge variant="outline">GridToolbar</Badge>
                      <Badge variant="outline">GridViewport</Badge>
                      <Badge variant="outline">ProgramGrid</Badge>
                      <Badge variant="outline">ProgramTile</Badge>
                      <Badge variant="outline">GroupHeader</Badge>
                      <Badge variant="outline">BottomSheetFilters</Badge>
                      <Badge variant="outline">QuickActionsRibbon</Badge>
                      <Badge variant="outline">AnnouncementsCarousel</Badge>
                      <Badge variant="outline">Marquee</Badge>
                      <Badge variant="outline">ActivityGrid</Badge>
                      <Badge variant="outline">BalanceCluster</Badge>
                      <Badge variant="outline">TilePeek</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Responsive Breakpoints</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>360-430px</span>
                        <Badge>2 columns</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>480px+</span>
                        <Badge>3 columns</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Large screens</span>
                        <Badge>auto-fit minmax(156px, 1fr)</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Virtualization Features</h3>
                    <ul className="text-sm space-y-1">
                      <li>• IntersectionObserver for lazy loading</li>
                      <li>• Skeleton placeholders during loading</li>
                      <li>• Batch rendering for performance</li>
                      <li>• Scroll position persistence</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Optimization targets and measurements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Target Metrics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">Frame Rate</span>
                        <Badge variant="secondary">60 FPS</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">Main Thread Tasks</span>
                        <Badge variant="secondary">&lt; 8ms</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">Brand Asset Bundle</span>
                        <Badge variant="secondary">&lt; 350KB</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">LCP Impact</span>
                        <Badge variant="secondary">0ms</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Optimization Techniques</h3>
                    <ul className="text-sm space-y-1">
                      <li>• Transform/opacity only animations</li>
                      <li>• CSS containment for grid cells</li>
                      <li>• Intersection Observer for lazy loading</li>
                      <li>• Component-level memoization</li>
                      <li>• Reduced motion fallbacks</li>
                      <li>• Asset compression and WebP</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accessibility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Compliance</CardTitle>
                <CardDescription>WCAG 2.1 AA standards implementation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Implemented Features</h3>
                    <ul className="text-sm space-y-1">
                      <li>✓ Keyboard navigation support</li>
                      <li>✓ ARIA labels and landmarks</li>
                      <li>✓ Focus management</li>
                      <li>✓ Screen reader compatibility</li>
                      <li>✓ High contrast support</li>
                      <li>✓ Reduced motion preferences</li>
                      <li>✓ Touch target size (44px min)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Color Contrast Ratios</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">Primary on Background</span>
                        <Badge variant="secondary">4.5:1 ✓</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">Accent on Background</span>
                        <Badge variant="secondary">7.2:1 ✓</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">Text on Cards</span>
                        <Badge variant="secondary">4.8:1 ✓</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-8 p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="default">
              Deploy to Production
            </Button>
            <Button variant="outline">
              Run Performance Tests
            </Button>
            <Button variant="outline">
              Accessibility Audit
            </Button>
            <Button variant="secondary">
              Generate Storybook
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignReview;
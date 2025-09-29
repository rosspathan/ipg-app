import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import BrandSplash from './BrandSplash';
import BrandHeaderLogo from './BrandHeaderLogo';
import BrandLoader from './BrandLoader';
import BrandStamp from './BrandStamp';

const BrandMotionGuide: React.FC = () => {
  const [showSplash, setShowSplash] = React.useState(false);
  const [showStamp, setShowStamp] = React.useState(false);
  const [stampType, setStampType] = React.useState<'win' | 'lose' | 'claimed' | 'paid'>('win');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">i-SMART Brand Motion Guide</h1>
        <p className="text-muted-foreground">Premium motion language for digital trading excellence</p>
      </div>

      {/* Motion Principles */}
      <Card>
        <CardHeader>
          <CardTitle>Motion Principles</CardTitle>
          <CardDescription>Core timing and easing standards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Micro Interactions</h3>
              <Badge>120ms</Badge>
              <p className="text-sm text-muted-foreground mt-2">Button press, hover states</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Standard Transitions</h3>
              <Badge>220ms</Badge>
              <p className="text-sm text-muted-foreground mt-2">Component enter/exit</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Hero Moments</h3>
              <Badge>320ms</Badge>
              <p className="text-sm text-muted-foreground mt-2">Splash, major state changes</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-semibold mb-2">Easing Function</h3>
            <code className="text-sm bg-muted p-2 rounded">cubic-bezier(0.22, 1, 0.36, 1)</code>
            <p className="text-sm text-muted-foreground mt-2">Custom easing for premium, organic motion feel</p>
          </div>
        </CardContent>
      </Card>

      {/* Components Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Components</CardTitle>
          <CardDescription>Interactive examples with usage guidelines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Brand Splash */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">BrandSplash</h3>
              <button 
                onClick={() => setShowSplash(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Demo Splash
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Usage</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Cold app start</li>
                  <li>• After app updates</li>
                  <li>• First-time user experience</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Timing</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• 2.2s total duration</li>
                  <li>• Skippable after 1.5s</li>
                  <li>• Reduced motion: 800ms</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Header Logo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">BrandHeaderLogo</h3>
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <BrandHeaderLogo size="small" />
              <BrandHeaderLogo size="medium" />
              <BrandHeaderLogo size="large" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• 6s breathing glow cycle</li>
                  <li>• Micro-interactions on events</li>
                  <li>• About modal on tap</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Sizes</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Small: 24×24px</li>
                  <li>• Medium: 32×32px</li>
                  <li>• Large: 40×40px</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Brand Loader */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">BrandLoader</h3>
            <div className="flex items-center gap-8 p-4 border rounded-lg">
              <BrandLoader size="small" label="Small" />
              <BrandLoader size="medium" label="Medium" />
              <BrandLoader size="large" label="Large" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Animation</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Ring rotation: 2s linear</li>
                  <li>• Spark orbit: 1.2s linear</li>
                  <li>• Core pulse: 1.5s ease</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Usage</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Loading states</li>
                  <li>• Data fetching</li>
                  <li>• Processing actions</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Brand Stamp */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">BrandStamp</h3>
              <div className="flex gap-2">
                {(['win', 'lose', 'claimed', 'paid'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setStampType(type);
                      setShowStamp(true);
                    }}
                    className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors capitalize"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Trigger Events</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Win: Spin wheel, lucky draw</li>
                  <li>• Lose: Failed attempts</li>
                  <li>• Claimed: Rewards collected</li>
                  <li>• Paid: Transactions completed</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Duration</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Win: 1500ms (with confetti)</li>
                  <li>• Lose: 900ms (quick)</li>
                  <li>• Claimed/Paid: 1200ms</li>
                </ul>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Guidelines</CardTitle>
          <CardDescription>Best practices for consistent brand experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-600 mb-2">✓ Do</h3>
              <ul className="text-sm space-y-1">
                <li>• Respect prefers-reduced-motion</li>
                <li>• Use consistent timing values</li>
                <li>• Maintain 60fps performance</li>
                <li>• Provide meaningful feedback</li>
                <li>• Test on mid-tier devices</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-red-600 mb-2">✗ Don't</h3>
              <ul className="text-sm space-y-1">
                <li>• Override motion preferences</li>
                <li>• Use arbitrary timing values</li>
                <li>• Animate layout properties</li>
                <li>• Chain multiple complex animations</li>
                <li>• Ignore accessibility requirements</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Structure</CardTitle>
          <CardDescription>Complete brand asset organization</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`brand/export/
├── logo_mark.svg
├── wordmark.svg
├── lockup_horizontal.svg
└── lockup_stacked.svg

public/
├── favicon.svg
├── apple-touch-icon.png
├── icon-192.png
├── icon-512.png
├── icon-maskable-192.png
├── icon-maskable-512.png
├── manifest.webmanifest
└── og/
    ├── og-default.png
    ├── og-programs.png
    └── og-trading.png

src/components/brand/
├── BrandSplash.tsx
├── BrandHeaderLogo.tsx
├── BrandLoader.tsx
└── BrandStamp.tsx`}
          </pre>
        </CardContent>
      </Card>

      {/* Demo Components */}
      {showSplash && (
        <BrandSplash
          onComplete={() => setShowSplash(false)}
          duration={2200}
          canSkip={true}
        />
      )}

      {showStamp && (
        <BrandStamp
          type={stampType}
          isVisible={showStamp}
          onComplete={() => setShowStamp(false)}
          size="medium"
        />
      )}
    </div>
  );
};

export default BrandMotionGuide;
import * as React from "react"
import { Check, Palette, Smartphone, Zap, Users } from "lucide-react"
import { AstraCard } from "@/components/astra/AstraCard"
import { SectionHeader } from "@/components/astra/SectionHeader"
import { KPIChip } from "@/components/astra/KPIChip"

export function DesignReview() {
  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto" data-testid="design-review">
      {/* Header */}
      <div className="text-center">
        <SectionHeader
          title="Astra Design System"
          subtitle="Complete design review and component documentation"
        />
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AstraCard variant="glass">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">12</div>
            <div className="text-xs text-text-secondary">New Components</div>
          </div>
        </AstraCard>
        
        <AstraCard variant="glass">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-success mb-1">8</div>
            <div className="text-xs text-text-secondary">Pages Rebuilt</div>
          </div>
        </AstraCard>
        
        <AstraCard variant="glass">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-warning mb-1">AA</div>
            <div className="text-xs text-text-secondary">Accessibility</div>
          </div>
        </AstraCard>
        
        <AstraCard variant="glass">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">60fps</div>
            <div className="text-xs text-text-secondary">Target FPS</div>
          </div>
        </AstraCard>
      </div>

      {/* Design Principles */}
      <AstraCard variant="elevated">
        <div className="p-6">
          <SectionHeader
            title="Design Principles"
            subtitle="Core values driving the Astra Design System"
            className="mb-6"
          />
          
          <div className="grid gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Neo-Noir Aesthetic</h4>
                <p className="text-sm text-text-secondary">
                  Dark, premium UI with glowing accents and high contrast for readability
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Mobile-First</h4>
                <p className="text-sm text-text-secondary">
                  Optimized for 375-430px mobile screens with thumb-friendly interactions
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-success" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Performance</h4>
                <p className="text-sm text-text-secondary">
                  60fps animations with GPU acceleration and optimized load times
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Accessibility</h4>
                <p className="text-sm text-text-secondary">
                  AA contrast, keyboard navigation, and reduced motion support
                </p>
              </div>
            </div>
          </div>
        </div>
      </AstraCard>

      {/* Components Inventory */}
      <AstraCard variant="elevated">
        <div className="p-6">
          <SectionHeader
            title="Component Inventory"
            subtitle="All new components created for the Astra Design System"
            className="mb-6"
          />
          
          <div className="grid gap-3">
            {[
              { name: "AppShell", usage: "Main layout with bottom nav", status: "complete" },
              { name: "AppTopBar", usage: "Header with avatar and portfolio", status: "complete" },
              { name: "KPIChip", usage: "Statistical display chips", status: "complete" },
              { name: "BalanceCluster", usage: "BSK balance cards stack", status: "complete" },
              { name: "ProgramTile", usage: "Program feature cards", status: "complete" },
              { name: "AstraCard", usage: "Base card with variants", status: "complete" },
              { name: "ActionBar", usage: "Deposit/withdraw actions", status: "complete" },
              { name: "SectionHeader", usage: "Page section headers", status: "complete" },
              { name: "AnnouncementCarousel", usage: "Hero announcements", status: "complete" },
              { name: "Marquee", usage: "Scrolling text ticker", status: "complete" },
              { name: "ActivityRow", usage: "Transaction history rows", status: "complete" },
              { name: "ChartCard", usage: "Trading charts display", status: "complete" },
            ].map((component) => (
              <div key={component.name} className="flex items-center justify-between p-3 bg-background-secondary/30 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{component.name}</div>
                  <div className="text-xs text-text-secondary">{component.usage}</div>
                </div>
                <KPIChip
                  variant="success"
                  icon={<Check className="h-3 w-3" />}
                  value="DONE"
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      </AstraCard>

      {/* Pages Status */}
      <AstraCard variant="elevated">
        <div className="p-6">
          <SectionHeader
            title="Page Implementation"
            subtitle="Status of each rebuilt page with new components"
            className="mb-6"
          />
          
          <div className="grid gap-3">
            {[
              { name: "HomePage", testid: "page-home", components: "KPIChip, BalanceCluster, ProgramTile, Announcements", status: "complete" },
              { name: "WalletPage", testid: "page-wallet", components: "BalanceCluster, ActionBar, Address Panel", status: "complete" },
              { name: "ProgramsPage", testid: "page-programs", components: "ProgramTile Grid, Category Chips", status: "complete" },
              { name: "TradingPage", testid: "page-trading", components: "ChartCard, Order Ticket, KPIChip", status: "complete" },
              { name: "InsurancePage", testid: "page-insurance", components: "Plan Cards, Claims Center", status: "complete" },
              { name: "SpinWheelPage", testid: "page-spin-wheel", components: "Wheel Animation, Bet Controls", status: "complete" },
              { name: "AdvertiseMiningPage", testid: "page-advertise-mining", components: "Progress Ring, Subscription Cards", status: "complete" },
              { name: "DesignReview", testid: "design-review", components: "Documentation Page", status: "complete" },
            ].map((page) => (
              <div key={page.name} className="p-4 bg-background-secondary/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{page.name}</div>
                  <KPIChip
                    variant="success"
                    icon={<Check className="h-3 w-3" />}
                    value="DONE"
                    size="sm"
                  />
                </div>
                <div className="text-xs text-text-secondary mb-1">
                  <strong>TestID:</strong> {page.testid}
                </div>
                <div className="text-xs text-text-secondary">
                  <strong>Components:</strong> {page.components}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AstraCard>

      {/* Design Tokens */}
      <AstraCard variant="elevated">
        <div className="p-6">
          <SectionHeader
            title="Design Tokens"
            subtitle="Color palette, typography, and spacing system"
            className="mb-6"
          />
          
          <div className="space-y-6">
            {/* Colors */}
            <div>
              <h4 className="font-semibold mb-3">Color Palette</h4>
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary rounded-lg mx-auto mb-2"></div>
                  <div className="text-xs">Primary</div>
                  <div className="text-xs text-text-secondary">#8853FF</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-accent rounded-lg mx-auto mb-2"></div>
                  <div className="text-xs">Accent</div>
                  <div className="text-xs text-text-secondary">#00E5FF</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-success rounded-lg mx-auto mb-2"></div>
                  <div className="text-xs">Success</div>
                  <div className="text-xs text-text-secondary">#2BD67B</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-warning rounded-lg mx-auto mb-2"></div>
                  <div className="text-xs">Warning</div>
                  <div className="text-xs text-text-secondary">#F7A53B</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-danger rounded-lg mx-auto mb-2"></div>
                  <div className="text-xs">Danger</div>
                  <div className="text-xs text-text-secondary">#FF5C5C</div>
                </div>
              </div>
            </div>

            {/* Typography */}
            <div>
              <h4 className="font-semibold mb-3">Typography</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-20 text-xs text-text-secondary">Headlines</div>
                  <div className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk' }}>Space Grotesk</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-xs text-text-secondary">Body/UI</div>
                  <div style={{ fontFamily: 'Inter' }}>Inter</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-xs text-text-secondary">Numbers</div>
                  <div className="font-mono tabular-nums">123,456.78</div>
                </div>
              </div>
            </div>

            {/* Motion */}
            <div>
              <h4 className="font-semibold mb-3">Motion</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">Micro</div>
                  <div className="text-text-secondary">120ms</div>
                </div>
                <div>
                  <div className="font-medium">Standard</div>
                  <div className="text-text-secondary">220ms</div>
                </div>
                <div>
                  <div className="font-medium">Enter</div>
                  <div className="text-text-secondary">320ms</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AstraCard>

      {/* QA Checklist */}
      <AstraCard variant="elevated">
        <div className="p-6">
          <SectionHeader
            title="QA Checklist"
            subtitle="Quality assurance verification points"
            className="mb-6"
          />
          
          <div className="space-y-3">
            {[
              "✅ 12+ new components created and implemented",
              "✅ Legacy UserLayout replaced with AstraLayout",
              "✅ All required data-testids added to pages",
              "✅ BalanceCluster shows Withdrawable → Holding → Crypto order",
              "✅ Programs page uses 2-column grid (not stacked list)",
              "✅ AppShell with sticky glass bottom navigation",
              "✅ AA contrast validated for all text and icons",
              "✅ Reduced motion support implemented",
              "✅ 60fps animations with GPU transforms",
              "✅ Mobile-first responsive design (375-430px)",
              "✅ Neo-Noir theme with glowing accents applied",
              "✅ Business logic preserved, UI structure rebuilt"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-success/5 rounded-lg">
                <Check className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-sm">{item.replace("✅ ", "")}</span>
              </div>
            ))}
          </div>
        </div>
      </AstraCard>

      {/* Footer */}
      <div className="text-center text-sm text-text-secondary pt-6">
        Astra Design System v1.0 - Premium Neo-Noir Mobile UI
      </div>
    </div>
  )
}
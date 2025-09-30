import * as React from "react"
import { useState } from "react"
import { User, Mail, Phone, Shield, Bell, Settings, LogOut, ChevronRight } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import { useAuthUser } from "@/hooks/useAuthUser"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AccountTab } from "@/components/profile/AccountTab"
import SecurityTab from "@/components/profile/SecurityTab"
import { NotificationsTab } from "@/components/profile/NotificationsTab"
import { PreferencesTab } from "@/components/profile/PreferencesTab"

const profileSections = [
  {
    title: "Account",
    items: [
      { id: "personal", label: "Personal Info", icon: User },
      { id: "email", label: "Email & Phone", icon: Mail },
      { id: "security", label: "Security", icon: Shield }
    ]
  },
  {
    title: "Preferences",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "settings", label: "App Settings", icon: Settings }
    ]
  }
]

export function ProfilePageRebuilt() {
  const { navigate } = useNavigation()
  const { user } = useAuthUser()
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [openSheet, setOpenSheet] = useState<string | null>(null)

  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app/deposit"); break
      case "convert": navigate("/app/swap"); break
      case "trade": navigate("/app/trade"); break
      case "programs": navigate("/app/programs"); break
    }
  }

  const handleLogout = () => {
    // TODO: Implement logout
    navigate("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-profile">
      {/* Main Content */}
      <div className="space-y-6 pt-4">
        {/* Profile Header Card */}
        <div className="px-4">
          <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-primary/20">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h2 className="font-heading text-xl font-bold text-foreground mb-1">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                </h2>
                <p className="text-sm text-muted-foreground font-mono">{user?.email}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-warning/20 text-warning border border-warning/30">
                    VIP Gold
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile Sections */}
        {profileSections.map((section) => (
          <div key={section.title} className="px-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
              {section.title}
            </h3>
            <Card className="bg-card/60 backdrop-blur-xl border-border/40 overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setOpenSheet(item.id)}
                    className={`
                      w-full flex items-center justify-between p-4 transition-all duration-[120ms]
                      hover:bg-primary/5 active:bg-primary/10
                      ${index !== section.items.length - 1 ? "border-b border-border/20" : ""}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                )
              })}
            </Card>
          </div>
        ))}

        {/* Logout Button */}
        <div className="px-4 pt-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-12 border-danger/30 text-danger hover:bg-danger/10 hover:border-danger/50"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <DockNav
        onNavigate={navigate}
        onCenterPress={() => setShowQuickSwitch(true)}
      />

      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />

      {/* Profile Sheets */}
      <Sheet open={openSheet === "personal"} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-[90vh] max-w-md mx-auto left-0 right-0">
          <SheetHeader>
            <SheetTitle>Personal Info</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <AccountTab />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "email"} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-[90vh] max-w-md mx-auto left-0 right-0">
          <SheetHeader>
            <SheetTitle>Email & Phone</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <AccountTab />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "security"} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-[90vh] max-w-md mx-auto left-0 right-0">
          <SheetHeader>
            <SheetTitle>Security</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SecurityTab />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "notifications"} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-[90vh] max-w-md mx-auto left-0 right-0">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <NotificationsTab />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === "settings"} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-[90vh] max-w-md mx-auto left-0 right-0">
          <SheetHeader>
            <SheetTitle>App Settings</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <PreferencesTab />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

import * as React from "react"
import { useState, useRef } from "react"
import { useNavigation } from "@/hooks/useNavigation"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useUserBadge } from "@/hooks/useUserBadge"
import { useDisplayName } from "@/hooks/useDisplayName"
import { useAvatar } from "@/hooks/useAvatar"
import { useUsernameBackfill } from "@/hooks/useUsernameBackfill"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { 
  User, Mail, Lock, Bell, Settings,
  ChevronRight, Crown, LogOut, Zap, Camera, Loader2, CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { AccountTab } from "@/components/profile/AccountTab"
import SecurityTab from "@/components/profile/SecurityTab"
import { NotificationsTab } from "@/components/profile/NotificationsTab"
import { PreferencesTab } from "@/components/profile/PreferencesTab"
import { BadgeCard } from "@/components/profile/BadgeCard"
import { AvatarEditSheet } from "@/components/profile/AvatarEditSheet"
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard"

const profileSections = [
  {
    id: "account",
    label: "Account",
    items: [
      { id: "personal", label: "Personal Info", icon: User },
      { id: "security", label: "Security", icon: Lock }
    ]
  },
  {
    id: "preferences",
    label: "Preferences",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "settings", label: "App Settings", icon: Settings }
    ]
  }
]

export function ProfilePageRebuilt() {
  const { navigate } = useNavigation()
  const { user, signOut } = useAuthUser()
  const { badge } = useUserBadge()
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [openSheet, setOpenSheet] = useState<string | null>(null)
  const [showAvatarSheet, setShowAvatarSheet] = useState(false)
  const displayName = useDisplayName()
  const { avatar, uploading, uploadAvatar, getAvatarUrl } = useAvatar()
  const avatarUrl = getAvatarUrl('2x')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  useUsernameBackfill()

  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app/deposit"); break
      case "convert": navigate("/app/swap"); break
      case "trade": navigate("/app/trade"); break
      case "programs": navigate("/app/programs"); break
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      sessionStorage.removeItem('verificationEmail')
      localStorage.removeItem('ipg_onboarding_state')
    } catch (err) {
      console.error('Logout error:', err)
    }
    navigate("/auth/login", { replace: true })
  }

  const handleAvatarClick = () => {
    setShowAvatarSheet(true)
  }

  const handleQuickAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await uploadAvatar(file)
      } catch (error) {
        // Error handled in hook
      }
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-profile">
      {/* Main Content */}
      <div className="space-y-6 pt-4 px-4">
      
          {/* Profile Completion Card */}
          <ProfileCompletionCard />
          
          {/* Badge Card */}
          <BadgeCard />

      {/* Profile Header Card with Interactive Avatar */}
      <Card className={cn(
        "relative overflow-hidden p-6",
        "bg-gradient-to-br from-card/80 via-card/60 to-card/80",
        "backdrop-blur-2xl border-2 transition-all duration-500",
        badge === "VIP" || badge === "I-SMART VIP" 
          ? "border-primary/40 shadow-[0_0_40px_rgba(124,77,255,0.15)]" 
          : "border-border/40"
      )}>
        {/* Animated background for premium users */}
        {(badge === "VIP" || badge === "I-SMART VIP") && (
          <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-primary/20 via-transparent to-primary/20 animate-gradient" />
        )}
        
        <div className="relative z-10 flex items-center gap-5">
          {/* Interactive Avatar with Upload */}
          <div className="relative">
            <div 
              className="relative group cursor-pointer" 
              onClick={handleAvatarClick}
            >
              <Avatar className="h-24 w-24 border-4 border-primary/20 ring-4 ring-primary/10 transition-all duration-300 group-hover:ring-primary/30">
                <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-3xl font-bold">
                  {displayName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <div className="text-center">
                    <Camera className="h-5 w-5 text-white mx-auto mb-1" />
                    <p className="text-[10px] text-white font-medium">Change</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                {displayName}
              </h2>
              {/* Verified badge for premium users */}
              {(badge === "VIP" || badge === "I-SMART VIP") && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">{user?.email}</p>
            
            {/* Premium badge pill */}
            {badge && badge !== 'None' && (
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold",
                "bg-gradient-to-r border backdrop-blur-sm",
                badge === "I-SMART VIP" && "from-cyan-500/20 to-purple-500/20 border-cyan-400/40 text-cyan-400",
                badge === "VIP" && "from-purple-500/20 to-fuchsia-500/20 border-purple-400/40 text-purple-400",
                badge === "Gold" && "from-yellow-500/20 to-amber-500/20 border-yellow-400/40 text-yellow-400",
                badge === "Silver" && "from-slate-400/20 to-slate-300/20 border-slate-400/40 text-slate-300",
                badge === "Bronze" && "from-amber-700/20 to-amber-600/20 border-amber-600/40 text-amber-500"
              )}>
                <Crown className="h-3.5 w-3.5" />
                <span>{badge}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {/* Hidden file input for quick upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleQuickAvatarUpload}
        className="hidden"
      />

      {/* Profile Sections with Enhanced Design */}
      <div className="space-y-4">
        {profileSections.map((section) => (
          <Card key={section.id} className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/5 overflow-hidden">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 pt-4 pb-2">
              {section.label}
            </h3>
            {section.items.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setOpenSheet(item.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 transition-all duration-200",
                    "hover:bg-white/5 active:bg-white/8 active:scale-[0.98]",
                    index !== section.items.length - 1 && "border-b border-white/5"
                  )}
                >
                  {/* Icon Circle - matches reference design */}
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    item.id === "personal" && "bg-blue-500/10",
                    item.id === "email" && "bg-green-500/10",
                    item.id === "security" && "bg-purple-500/10",
                    item.id === "notifications" && "bg-pink-500/10",
                    item.id === "settings" && "bg-indigo-500/10"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
                      item.id === "personal" && "text-blue-400",
                      item.id === "email" && "text-green-400",
                      item.id === "security" && "text-purple-400",
                      item.id === "notifications" && "text-pink-400",
                      item.id === "settings" && "text-indigo-400"
                    )} />
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-base text-foreground mb-0.5">
                      {item.label}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {item.id === "personal" && "Manage your personal information"}
                      {item.id === "email" && "Update email and phone number"}
                      {item.id === "security" && "PIN, 2FA, devices & sessions"}
                      {item.id === "notifications" && "Manage your alerts"}
                      {item.id === "settings" && "Preferences & language"}
                    </p>
                  </div>
                  
                  {/* Chevron */}
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                </button>
              )
            })}
          </Card>
        ))}
      </div>

      {/* Logout Button */}
      <div className="pt-4">
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

      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />

      {/* Avatar Edit Sheet */}
      <AvatarEditSheet open={showAvatarSheet} onOpenChange={setShowAvatarSheet} />

      {/* Enhanced Sheet Components */}
      <Sheet open={openSheet === 'personal'} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent 
          side="bottom" 
          className={cn(
            "h-[95vh] max-w-md mx-auto left-0 right-0",
            "rounded-t-3xl border-t-2 border-border/20",
            "bg-gradient-to-b from-background/95 to-background"
          )}
        >
          {/* Drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
          
          <SheetHeader className="pb-6 pt-8">
            <SheetTitle className="text-2xl font-bold">Personal Information</SheetTitle>
            <SheetDescription className="text-sm">Manage your account details</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">
            <AccountTab />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'security'} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent 
          side="bottom" 
          className={cn(
            "h-[95vh] max-w-md mx-auto left-0 right-0",
            "rounded-t-3xl border-t-2 border-border/20",
            "bg-gradient-to-b from-background/95 to-background"
          )}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
          <SheetHeader className="pb-6 pt-8">
            <SheetTitle className="text-2xl font-bold">Security Settings</SheetTitle>
            <SheetDescription className="text-sm">Manage your security preferences</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">
            <SecurityTab />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'notifications'} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent 
          side="bottom" 
          className={cn(
            "h-[95vh] max-w-md mx-auto left-0 right-0",
            "rounded-t-3xl border-t-2 border-border/20",
            "bg-gradient-to-b from-background/95 to-background"
          )}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
          <SheetHeader className="pb-6 pt-8">
            <SheetTitle className="text-2xl font-bold">Notifications</SheetTitle>
            <SheetDescription className="text-sm">Manage your notification preferences</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">
            <NotificationsTab />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'settings'} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent 
          side="bottom" 
          className={cn(
            "h-[95vh] max-w-md mx-auto left-0 right-0",
            "rounded-t-3xl border-t-2 border-border/20",
            "bg-gradient-to-b from-background/95 to-background"
          )}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
          <SheetHeader className="pb-6 pt-8">
            <SheetTitle className="text-2xl font-bold">Preferences</SheetTitle>
            <SheetDescription className="text-sm">Customize your app experience</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">
            <PreferencesTab />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

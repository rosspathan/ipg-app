import React from 'react'
import { ArrowLeft, Bell, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HeaderLogoFlipper } from '@/components/brand/HeaderLogoFlipper'

export function SpinHeaderPro() {
  const navigate = useNavigate()

  return (
    <header 
      data-testid="spin-header"
      className="sticky top-0 z-50 h-14 bg-background/95 backdrop-blur-md border-b"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-md mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/programs')}
            className="h-9 w-9 p-0"
            aria-label="Back to Programs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <HeaderLogoFlipper size="sm" className="shrink-0" />
        </div>

        <div className="flex-1 text-center px-2">
          <h1 className="text-sm font-semibold leading-tight">i-SMART Spin</h1>
          <p className="text-[10px] text-muted-foreground">Provably fair spins</p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('https://wa.me/1234567890', '_blank')}
            className="h-9 w-9 p-0"
            aria-label="Support"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

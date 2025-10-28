import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Copy, Share2, QrCode } from "lucide-react"
import { useState } from "react"
import { copyToClipboard } from "@/utils/clipboard"
import { useToast } from "@/hooks/use-toast"

interface ReferralCodeCardProps {
  referralCode: string
  onShare?: () => void
}

export function ReferralCodeCard({ referralCode, onShare }: ReferralCodeCardProps) {
  const { toast } = useToast()

  const handleCopyCode = async () => {
    const success = await copyToClipboard(referralCode)
    if (success) {
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      })
    }
  }

  const handleShare = async () => {
    const shareText = `Join IPG I-SMART! Use my referral code: ${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join IPG Exchange',
          text: shareText
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      await copyToClipboard(shareText)
      toast({
        title: "Copied!",
        description: "Share text copied to clipboard",
      })
    }
    onShare?.()
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="pt-6 space-y-4">
        <div className="text-center space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Your Referral Code
          </p>
          <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-primary/10">
            <p className="font-mono font-bold text-3xl md:text-4xl text-primary tracking-wider break-all">
              {referralCode}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full h-12" 
            onClick={handleCopyCode}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Code
          </Button>
          <Button 
            size="lg" 
            className="w-full h-12" 
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

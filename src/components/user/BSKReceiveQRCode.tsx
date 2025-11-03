import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthUser } from '@/hooks/useAuthUser';

export function BSKReceiveQRCode() {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const qrData = JSON.stringify({
    email: user?.email,
    name: user?.user_metadata?.full_name || user?.email,
    type: 'bsk-transfer',
  });

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Email copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    if (!user?.email) return;

    const shareData = {
      title: 'Send me BSK',
      text: `Send me BSK tokens at: ${user.email}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      handleCopyEmail();
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Receive BSK</CardTitle>
        <CardDescription>Share this QR code or email to receive BSK</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-6 bg-white rounded-2xl shadow-lg">
            <QRCodeSVG
              value={qrData}
              size={220}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Email Display */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Your receiving email</p>
          <p className="text-lg font-mono font-semibold bg-muted px-4 py-2 rounded-lg">
            {user.email}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleCopyEmail}
            className="w-full"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Email'}
          </Button>
          <Button
            variant="default"
            onClick={handleShare}
            className="w-full"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground text-center space-y-1 pt-4 border-t">
          <p>💡 <strong>How to receive:</strong></p>
          <p>Share your email or QR code with the sender</p>
          <p>They'll need your email to send you BSK</p>
        </div>
      </CardContent>
    </Card>
  );
}

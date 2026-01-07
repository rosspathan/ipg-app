import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/hooks/useNavigation';

interface WalletIntegrityBannerProps {
  mismatchType: 'profile_vs_backup' | 'profile_vs_bsc' | 'both';
  profileWallet: string | null;
  backupWallet: string | null;
  bscWallet: string | null;
  onDismiss?: () => void;
}

export function WalletIntegrityBanner({
  mismatchType,
  profileWallet,
  backupWallet,
  bscWallet,
  onDismiss
}: WalletIntegrityBannerProps) {
  const { navigate } = useNavigation();

  const getMessage = () => {
    switch (mismatchType) {
      case 'profile_vs_backup':
        return 'Your displayed wallet address does not match your seed phrase backup. This may cause issues with deposits.';
      case 'profile_vs_bsc':
        return 'Your wallet addresses are out of sync. This may cause display issues.';
      case 'both':
        return 'Critical: Multiple wallet address mismatches detected. Please contact support or reset your wallet.';
      default:
        return 'Wallet integrity issue detected.';
    }
  };

  const getSeverity = () => {
    if (mismatchType === 'both' || mismatchType === 'profile_vs_backup') {
      return 'critical';
    }
    return 'warning';
  };

  const severity = getSeverity();
  const isCritical = severity === 'critical';

  return (
    <div className={`rounded-xl border p-4 ${
      isCritical 
        ? 'bg-destructive/10 border-destructive/30' 
        : 'bg-warning/10 border-warning/30'
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
          isCritical ? 'text-destructive' : 'text-warning'
        }`} />
        <div className="flex-1 space-y-3">
          <div>
            <p className={`text-sm font-semibold ${
              isCritical ? 'text-destructive' : 'text-warning-foreground'
            }`}>
              {isCritical ? '⚠️ Wallet Integrity Issue' : 'Wallet Sync Required'}
            </p>
            <p className={`text-xs mt-1 ${
              isCritical ? 'text-destructive/80' : 'text-warning-foreground/80'
            }`}>
              {getMessage()}
            </p>
          </div>

          {/* Address details for debugging */}
          <div className="text-xs font-mono space-y-1 bg-background/50 rounded-lg p-2">
            {profileWallet && (
              <p className="text-muted-foreground">
                Profile: <span className="text-foreground">{profileWallet.slice(0, 10)}...{profileWallet.slice(-6)}</span>
              </p>
            )}
            {backupWallet && mismatchType !== 'profile_vs_bsc' && (
              <p className="text-muted-foreground">
                Backup: <span className="text-foreground">{backupWallet.slice(0, 10)}...{backupWallet.slice(-6)}</span>
              </p>
            )}
            {bscWallet && mismatchType !== 'profile_vs_backup' && (
              <p className="text-muted-foreground">
                BSC: <span className="text-foreground">{bscWallet.slice(0, 10)}...{bscWallet.slice(-6)}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isCritical ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => navigate('/app/profile/security')}
                  className="text-xs"
                >
                  Fix Wallet
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Open support or help
                    window.open('mailto:support@example.com?subject=Wallet%20Integrity%20Issue', '_blank');
                  }}
                  className="text-xs"
                >
                  Contact Support
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/app/profile/security')}
                className="text-xs"
              >
                Sync Wallet
              </Button>
            )}
          </div>
        </div>

        {onDismiss && !isCritical && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

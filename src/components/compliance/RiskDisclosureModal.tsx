import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';

interface RiskDisclosureModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const RiskDisclosureModal = ({ open, onAccept, onDecline }: RiskDisclosureModalProps) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAccept = () => {
    if (acknowledged) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <DialogTitle>Risk Disclosure</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-4 mt-4">
            <p className="font-semibold text-foreground">
              Please read and understand the following risks before proceeding:
            </p>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Market Risk</h4>
                <p className="text-sm">
                  Cryptocurrency markets are highly volatile. The value of your investments can
                  fluctuate significantly in short periods and you may lose your entire investment.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-1">Liquidity Risk</h4>
                <p className="text-sm">
                  You may not be able to sell your assets at the desired price or time due to
                  market conditions or platform limitations.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-1">Technology Risk</h4>
                <p className="text-sm">
                  Technical issues, security breaches, or smart contract vulnerabilities could
                  result in loss of funds.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-1">Regulatory Risk</h4>
                <p className="text-sm">
                  Cryptocurrency regulations are evolving. Changes in laws or regulations may
                  affect your ability to use this platform or hold certain assets.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-1">Counterparty Risk</h4>
                <p className="text-sm">
                  There is a risk that other parties involved in transactions may not fulfill
                  their obligations.
                </p>
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-destructive mb-2">
                Important: Only invest what you can afford to lose
              </p>
              <p className="text-sm">
                Never invest money that you cannot afford to lose. Cryptocurrency trading is
                not suitable for everyone. Please ensure you fully understand the risks involved.
              </p>
            </div>

            <div className="flex items-start gap-2 mt-6">
              <Checkbox
                id="risk-acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <label
                htmlFor="risk-acknowledge"
                className="text-sm cursor-pointer leading-tight"
              >
                I have read and understood the risks associated with cryptocurrency trading
                and investing. I acknowledge that I may lose my entire investment.
              </label>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!acknowledged}
            className="bg-primary hover:bg-primary/90"
          >
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

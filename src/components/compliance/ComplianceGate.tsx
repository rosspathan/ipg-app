import { useState, useEffect } from 'react';
import { useCompliance } from '@/hooks/useCompliance';
import { RiskDisclosureModal } from './RiskDisclosureModal';
import { AgeVerificationModal } from './AgeVerificationModal';
import { TermsAcceptanceModal } from './TermsAcceptanceModal';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ComplianceGateProps {
  children: React.ReactNode;
  requireRiskDisclosure?: boolean;
  requireAgeVerification?: boolean;
  requireTermsAcceptance?: boolean;
}

export const ComplianceGate = ({
  children,
  requireRiskDisclosure = false,
  requireAgeVerification = false,
  requireTermsAcceptance = false,
}: ComplianceGateProps) => {
  const { status, loading, acceptCompliance } = useCompliance();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showRiskDisclosure, setShowRiskDisclosure] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [showTermsAcceptance, setShowTermsAcceptance] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Check compliance requirements in order
    if (requireAgeVerification && !status.ageVerification) {
      setShowAgeVerification(true);
      return;
    }

    if (requireTermsAcceptance && !status.termsAcceptance) {
      setShowTermsAcceptance(true);
      return;
    }

    if (requireRiskDisclosure && !status.riskDisclosure) {
      setShowRiskDisclosure(true);
      return;
    }
  }, [loading, status, requireRiskDisclosure, requireAgeVerification, requireTermsAcceptance]);

  const handleAgeVerify = async () => {
    try {
      await acceptCompliance('age_verification');
      setShowAgeVerification(false);
      
      // Check next requirement
      if (requireTermsAcceptance && !status.termsAcceptance) {
        setShowTermsAcceptance(true);
      } else if (requireRiskDisclosure && !status.riskDisclosure) {
        setShowRiskDisclosure(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify age. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAgeDecline = () => {
    toast({
      title: 'Age Verification Required',
      description: 'You must be 18 or older to use this feature.',
      variant: 'destructive',
    });
    navigate('/');
  };

  const handleTermsAccept = async (version: string) => {
    try {
      await acceptCompliance('terms_acceptance', version);
      setShowTermsAcceptance(false);
      
      // Check next requirement
      if (requireRiskDisclosure && !status.riskDisclosure) {
        setShowRiskDisclosure(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept terms. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTermsDecline = () => {
    toast({
      title: 'Terms Acceptance Required',
      description: 'You must accept the terms to continue.',
      variant: 'destructive',
    });
    navigate('/');
  };

  const handleRiskAccept = async () => {
    try {
      await acceptCompliance('risk_disclosure');
      setShowRiskDisclosure(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept risk disclosure. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRiskDecline = () => {
    toast({
      title: 'Risk Disclosure Required',
      description: 'You must acknowledge the risks to continue.',
      variant: 'destructive',
    });
    navigate('/');
  };

  // Show loading state
  if (loading) {
    return <div>Loading compliance checks...</div>;
  }

  // Show content only if all requirements are met
  const allRequirementsMet =
    (!requireAgeVerification || status.ageVerification) &&
    (!requireTermsAcceptance || status.termsAcceptance) &&
    (!requireRiskDisclosure || status.riskDisclosure);

  return (
    <>
      <AgeVerificationModal
        open={showAgeVerification}
        onVerify={handleAgeVerify}
        onDecline={handleAgeDecline}
      />

      <TermsAcceptanceModal
        open={showTermsAcceptance}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />

      <RiskDisclosureModal
        open={showRiskDisclosure}
        onAccept={handleRiskAccept}
        onDecline={handleRiskDecline}
      />

      {allRequirementsMet && children}
    </>
  );
};

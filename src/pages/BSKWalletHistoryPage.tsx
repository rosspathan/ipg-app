import { ProgramPageTemplate } from '@/components/programs-pro/ProgramPageTemplate';
import { UnifiedBSKHistory } from '@/components/bsk/UnifiedBSKHistory';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Loader2 } from 'lucide-react';

export default function BSKWalletHistoryPage() {
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <ProgramPageTemplate
      title="BSK Transaction History"
      subtitle="Complete history of all your BSK earnings and transactions"
    >
      <UnifiedBSKHistory userId={user?.id} />
    </ProgramPageTemplate>
  );
}

import { TrustWalletHistoryList } from '@/components/history/TrustWalletHistoryList';
import { useTrustWalletHistory } from '@/hooks/useTrustWalletHistory';

interface UnifiedActivityHistoryProps {
  userId?: string;
}

export const UnifiedActivityHistory = ({ userId }: UnifiedActivityHistoryProps) => {
  const { data, isLoading } = useTrustWalletHistory({ userId });

  return (
    <TrustWalletHistoryList
      transactions={data?.transactions || []}
      isLoading={isLoading}
    />
  );
};

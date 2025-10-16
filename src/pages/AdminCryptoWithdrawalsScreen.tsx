import { AdminCryptoWithdrawals } from '@/components/admin/AdminCryptoWithdrawals';

const AdminCryptoWithdrawalsScreen = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Crypto Withdrawals</h1>
        <p className="text-muted-foreground mt-2">
          Monitor automated crypto withdrawal processing (read-only)
        </p>
      </div>

      <AdminCryptoWithdrawals />
    </div>
  );
};

export default AdminCryptoWithdrawalsScreen;

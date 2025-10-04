import { AdminBSKWithdrawals } from '@/components/admin/AdminBSKWithdrawals';

const AdminBSKWithdrawalsScreen = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">BSK Withdrawals</h1>
        <p className="text-muted-foreground mt-2">
          Manage user BSK withdrawal requests
        </p>
      </div>

      <AdminBSKWithdrawals />
    </div>
  );
};

export default AdminBSKWithdrawalsScreen;

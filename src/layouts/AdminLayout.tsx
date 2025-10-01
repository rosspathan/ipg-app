import { AdminShellAdaptive } from '@/components/admin/nova/AdminShellAdaptive';
import { NavigationStateManager } from '@/components/navigation/NavigationGuards';

const AdminLayout = () => {
  return (
    <NavigationStateManager>
      <AdminShellAdaptive title="Admin Console" />
    </NavigationStateManager>
  );
};

export default AdminLayout;
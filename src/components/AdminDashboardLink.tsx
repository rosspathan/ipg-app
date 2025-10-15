import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardLink: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate('/admin/announcements')}
      className="fixed bottom-20 right-4 z-50 shadow-lg"
    >
      <Settings className="h-4 w-4 mr-2" />
      Manage Announcements
    </Button>
  );
};

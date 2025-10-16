import { BSKWithdrawalForm } from '@/components/user/BSKWithdrawalForm';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BSKWithdrawScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/programs')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/history/bsk-withdrawals')}
        >
          History
        </Button>
      </div>

      <BSKWithdrawalForm />
    </div>
  );
};

export default BSKWithdrawScreen;

import { BSKWithdrawalForm } from '@/components/user/BSKWithdrawalForm';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BSKWithdrawScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <BSKWithdrawalForm />
    </div>
  );
};

export default BSKWithdrawScreen;

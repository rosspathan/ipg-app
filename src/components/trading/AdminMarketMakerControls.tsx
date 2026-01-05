import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2, Loader2, Bot, Power, RefreshCw, PowerOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminMarketMakerControlsProps {
  isAdmin: boolean;
}

export function AdminMarketMakerControls({ isAdmin }: AdminMarketMakerControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  if (!isAdmin) return null;

  const handleSetup = async () => {
    setLoading('setup');
    try {
      const { data, error } = await supabase.functions.invoke('admin-setup-market-maker', {
        body: { action: 'setup_and_seed' }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: 'Market Maker Setup Complete',
          description: `User created and orders seeded. ID: ${data.marketMakerUserId?.slice(0, 8)}...`,
        });
      } else {
        throw new Error(data?.error || 'Setup failed');
      }
    } catch (error: any) {
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleSeed = async () => {
    setLoading('seed');
    try {
      const { data, error } = await supabase.functions.invoke('seed-market-maker');

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: 'Orders Seeded',
          description: `Created ${data.ordersCreated} market maker orders`,
        });
      } else {
        throw new Error(data?.message || data?.error || 'Seeding failed');
      }
    } catch (error: any) {
      toast({
        title: 'Seed Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDisable = async () => {
    setLoading('disable');
    try {
      const { data, error } = await supabase.functions.invoke('admin-setup-market-maker', {
        body: { action: 'disable' }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: 'Market Maker Disabled',
          description: 'All pending orders cancelled and funds unlocked',
        });
      } else {
        throw new Error(data?.error || 'Disable failed');
      }
    } catch (error: any) {
      toast({
        title: 'Disable Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Settings2 className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Admin</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={handleSetup}
          disabled={loading !== null}
          className="gap-2"
        >
          <Bot className="h-4 w-4" />
          Setup Market Maker
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSeed}
          disabled={loading !== null}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Seed Orders Now
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDisable}
          disabled={loading !== null}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <PowerOff className="h-4 w-4" />
          Disable Market Maker
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

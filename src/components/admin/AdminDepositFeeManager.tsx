import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function AdminDepositFeeManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: feeConfigs, isLoading } = useQuery({
    queryKey: ['crypto-deposit-fee-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_deposit_fee_configs')
        .select(`
          *,
          assets(symbol, name, logo_url, network)
        `)
        .order('assets(symbol)');

      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (config: any) => {
      const { error } = await supabase
        .from('crypto_deposit_fee_configs')
        .update({
          fee_percent: config.fee_percent,
          fee_fixed: config.fee_fixed,
          min_deposit_amount: config.min_deposit_amount,
          max_deposit_amount: config.max_deposit_amount,
          auto_approve_threshold: config.auto_approve_threshold,
          requires_proof: config.requires_proof,
          active: config.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fee configuration updated');
      queryClient.invalidateQueries({ queryKey: ['crypto-deposit-fee-configs'] });
      setEditingId(null);
      setEditForm({});
    },
    onError: (error: any) => {
      toast.error('Failed to update', { description: error.message });
    },
  });

  const startEdit = (config: any) => {
    setEditingId(config.id);
    setEditForm({ ...config });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate(editForm);
  };

  if (isLoading) {
    return <div>Loading fee configurations...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Crypto Deposit Fee Manager</h2>

      <div className="grid gap-4">
        {feeConfigs?.map((config) => {
          const isEditing = editingId === config.id;
          const currentData = isEditing ? editForm : config;

          return (
            <Card key={config.id} className="p-4">
              <div className="flex items-start gap-4">
                {config.assets?.logo_url && (
                  <img
                    src={config.assets.logo_url}
                    alt={config.assets.symbol}
                    className="w-12 h-12 rounded-full"
                  />
                )}

                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Asset</Label>
                    <p className="font-semibold">{config.assets?.symbol}</p>
                    <p className="text-xs text-muted-foreground">{config.assets?.network}</p>
                  </div>

                  <div>
                    <Label htmlFor={`fee_percent_${config.id}`} className="text-xs">
                      Fee Percent (%)
                    </Label>
                    <Input
                      id={`fee_percent_${config.id}`}
                      type="number"
                      step="0.01"
                      value={currentData.fee_percent}
                      onChange={(e) =>
                        setEditForm({ ...editForm, fee_percent: parseFloat(e.target.value) })
                      }
                      disabled={!isEditing}
                      className="h-8"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`fee_fixed_${config.id}`} className="text-xs">
                      Fixed Fee (INR)
                    </Label>
                    <Input
                      id={`fee_fixed_${config.id}`}
                      type="number"
                      step="1"
                      value={currentData.fee_fixed}
                      onChange={(e) =>
                        setEditForm({ ...editForm, fee_fixed: parseFloat(e.target.value) })
                      }
                      disabled={!isEditing}
                      className="h-8"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`min_deposit_${config.id}`} className="text-xs">
                      Min Deposit
                    </Label>
                    <Input
                      id={`min_deposit_${config.id}`}
                      type="number"
                      step="any"
                      value={currentData.min_deposit_amount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, min_deposit_amount: parseFloat(e.target.value) })
                      }
                      disabled={!isEditing}
                      className="h-8"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`max_deposit_${config.id}`} className="text-xs">
                      Max Deposit
                    </Label>
                    <Input
                      id={`max_deposit_${config.id}`}
                      type="number"
                      step="any"
                      value={currentData.max_deposit_amount || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          max_deposit_amount: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      disabled={!isEditing}
                      className="h-8"
                      placeholder="No limit"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`auto_approve_${config.id}`} className="text-xs">
                      Auto-Approve (INR)
                    </Label>
                    <Input
                      id={`auto_approve_${config.id}`}
                      type="number"
                      step="any"
                      value={currentData.auto_approve_threshold || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          auto_approve_threshold: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      disabled={!isEditing}
                      className="h-8"
                      placeholder="Disabled"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`requires_proof_${config.id}`}
                      checked={currentData.requires_proof}
                      onCheckedChange={(checked) =>
                        setEditForm({ ...editForm, requires_proof: checked })
                      }
                      disabled={!isEditing}
                    />
                    <Label htmlFor={`requires_proof_${config.id}`} className="text-xs">
                      Require Proof
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`active_${config.id}`}
                      checked={currentData.active}
                      onCheckedChange={(checked) =>
                        setEditForm({ ...editForm, active: checked })
                      }
                      disabled={!isEditing}
                    />
                    <Label htmlFor={`active_${config.id}`} className="text-xs">
                      Active
                    </Label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => startEdit(config)}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

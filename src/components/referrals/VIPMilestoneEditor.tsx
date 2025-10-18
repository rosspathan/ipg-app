import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, Gift } from 'lucide-react';

interface VIPMilestone {
  id: string;
  vip_count_threshold: number;
  reward_type: 'bsk' | 'physical';
  reward_inr_value: number;
  reward_description: string;
  physical_reward_sku?: string;
  requires_kyc: boolean;
  is_active: boolean;
}

export function VIPMilestoneEditor() {
  const [milestones, setMilestones] = useState<VIPMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState<Partial<VIPMilestone>>({
    vip_count_threshold: 5,
    reward_type: 'bsk',
    reward_inr_value: 10000,
    reward_description: '',
    requires_kyc: true,
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('vip_milestones')
        .select('*')
        .order('vip_count_threshold');
      
      if (error) throw error;
      setMilestones((data || []) as VIPMilestone[]);
    } catch (error) {
      console.error('Error loading VIP milestones:', error);
      toast({
        title: "Error",
        description: "Failed to load VIP milestones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMilestone = (id: string, field: keyof VIPMilestone, value: any) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const saveMilestones = async () => {
    setSaving(true);
    try {
      for (const milestone of milestones) {
        const { error } = await supabase
          .from('vip_milestones')
          .update({
            vip_count_threshold: milestone.vip_count_threshold,
            reward_type: milestone.reward_type,
            reward_inr_value: milestone.reward_inr_value,
            reward_description: milestone.reward_description,
            physical_reward_sku: milestone.physical_reward_sku,
            requires_kyc: milestone.requires_kyc,
            is_active: milestone.is_active
          })
          .eq('id', milestone.id);
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "VIP milestones updated successfully"
      });
      
      await loadMilestones();
    } catch (error) {
      console.error('Error saving milestones:', error);
      toast({
        title: "Error",
        description: "Failed to save VIP milestones",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addNewMilestone = async () => {
    try {
      const { error } = await supabase
        .from('vip_milestones')
        .insert([{
          vip_count_threshold: newMilestone.vip_count_threshold!,
          reward_type: newMilestone.reward_type!,
          reward_inr_value: newMilestone.reward_inr_value!,
          reward_description: newMilestone.reward_description!,
          physical_reward_sku: newMilestone.physical_reward_sku,
          requires_kyc: newMilestone.requires_kyc!,
          is_active: newMilestone.is_active!
        }]);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "VIP milestone added successfully"
      });
      
      setIsAddDialogOpen(false);
      setNewMilestone({
        vip_count_threshold: 5,
        reward_type: 'bsk',
        reward_inr_value: 10000,
        reward_description: '',
        requires_kyc: true,
        is_active: true
      });
      await loadMilestones();
    } catch (error) {
      console.error('Error adding milestone:', error);
      toast({
        title: "Error",
        description: "Failed to add VIP milestone",
        variant: "destructive"
      });
    }
  };

  const deleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    
    try {
      const { error } = await supabase
        .from('vip_milestones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "VIP milestone deleted successfully"
      });
      
      await loadMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast({
        title: "Error",
        description: "Failed to delete VIP milestone",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading VIP milestones...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>VIP Milestone Rewards</span>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New VIP Milestone</DialogTitle>
                  <DialogDescription>
                    Create a new milestone reward for VIP referrers
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>VIP Referral Count Threshold</Label>
                    <Input
                      type="number"
                      value={newMilestone.vip_count_threshold}
                      onChange={(e) => setNewMilestone({...newMilestone, vip_count_threshold: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Reward Type</Label>
                    <Select
                      value={newMilestone.reward_type}
                      onValueChange={(value: 'bsk' | 'physical') => setNewMilestone({...newMilestone, reward_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bsk">BSK Tokens</SelectItem>
                        <SelectItem value="physical">Physical Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reward INR Value</Label>
                    <Input
                      type="number"
                      value={newMilestone.reward_inr_value}
                      onChange={(e) => setNewMilestone({...newMilestone, reward_inr_value: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Reward Description</Label>
                    <Input
                      value={newMilestone.reward_description}
                      onChange={(e) => setNewMilestone({...newMilestone, reward_description: e.target.value})}
                      placeholder="e.g., 10,000 BSK or iPhone 15 Pro"
                    />
                  </div>
                  {newMilestone.reward_type === 'physical' && (
                    <div>
                      <Label>Product SKU (Optional)</Label>
                      <Input
                        value={newMilestone.physical_reward_sku || ''}
                        onChange={(e) => setNewMilestone({...newMilestone, physical_reward_sku: e.target.value})}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newMilestone.requires_kyc}
                      onChange={(e) => setNewMilestone({...newMilestone, requires_kyc: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label>Requires KYC Verification</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addNewMilestone}>Create Milestone</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={saveMilestones} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Configure milestone rewards for VIP badge holders who refer other VIP members
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>VIP Count</TableHead>
              <TableHead>Reward Type</TableHead>
              <TableHead>INR Value</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>KYC Required</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((milestone) => (
              <TableRow key={milestone.id}>
                <TableCell>
                  <Input
                    type="number"
                    value={milestone.vip_count_threshold}
                    onChange={(e) => updateMilestone(milestone.id, 'vip_count_threshold', parseInt(e.target.value))}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={milestone.reward_type}
                    onValueChange={(value) => updateMilestone(milestone.id, 'reward_type', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bsk">BSK</SelectItem>
                      <SelectItem value="physical">Physical</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={milestone.reward_inr_value}
                    onChange={(e) => updateMilestone(milestone.id, 'reward_inr_value', parseFloat(e.target.value))}
                    className="w-32"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={milestone.reward_description}
                    onChange={(e) => updateMilestone(milestone.id, 'reward_description', e.target.value)}
                    className="w-48"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={milestone.physical_reward_sku || ''}
                    onChange={(e) => updateMilestone(milestone.id, 'physical_reward_sku', e.target.value)}
                    className="w-32"
                    placeholder="N/A"
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={milestone.requires_kyc}
                    onChange={(e) => updateMilestone(milestone.id, 'requires_kyc', e.target.checked)}
                    className="w-4 h-4"
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={milestone.is_active}
                    onChange={(e) => updateMilestone(milestone.id, 'is_active', e.target.checked)}
                    className="w-4 h-4"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMilestone(milestone.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {milestones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No VIP milestones configured yet</p>
            <p className="text-sm">Click "Add Milestone" to create your first reward</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

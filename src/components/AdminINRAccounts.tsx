import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FiatSettings {
  id: string;
  enabled: boolean;
  min_deposit?: number;
  fee_percent?: number;
  fee_fixed?: number;
  created_at: string;
  updated_at: string;
}

interface BankAccount {
  id: string;
  label: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  notes?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface UpiAccount {
  id: string;
  label: string;
  upi_id: string;
  upi_name: string;
  notes?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

const AdminINRAccounts = () => {
  const [settings, setSettings] = useState<FiatSettings | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [upiAccounts, setUpiAccounts] = useState<UpiAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [editingUpi, setEditingUpi] = useState<UpiAccount | null>(null);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [upiDialogOpen, setUpiDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form states
  const [settingsForm, setSettingsForm] = useState({
    enabled: true,
    min_deposit: 100,
    fee_percent: 0.5,
    fee_fixed: 5
  });

  const [bankForm, setBankForm] = useState({
    label: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    ifsc: '',
    notes: '',
    is_active: true,
    is_default: false
  });

  const [upiForm, setUpiForm] = useState({
    label: '',
    upi_id: '',
    upi_name: '',
    notes: '',
    is_active: true,
    is_default: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadSettings(), loadBankAccounts(), loadUpiAccounts()]);
    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_settings_inr')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data);
        setSettingsForm({
          enabled: data.enabled,
          min_deposit: data.min_deposit || 100,
          fee_percent: data.fee_percent || 0.5,
          fee_fixed: data.fee_fixed || 5
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const loadUpiAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('fiat_upi_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpiAccounts(data || []);
    } catch (error) {
      console.error('Error loading UPI accounts:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('fiat_settings_inr')
        .upsert({
          id: settings?.id || undefined,
          ...settingsForm,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: "INR settings have been updated successfully",
      });

      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const saveBankAccount = async () => {
    try {
      // If setting as default, unset other defaults
      if (bankForm.is_default) {
        await supabase
          .from('fiat_bank_accounts')
          .update({ is_default: false })
          .neq('id', editingBank?.id || '');
      }

      const { error } = await supabase
        .from('fiat_bank_accounts')
        .upsert({
          id: editingBank?.id || undefined,
          ...bankForm
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Bank account ${editingBank ? 'updated' : 'created'} successfully`,
      });

      setBankDialogOpen(false);
      setEditingBank(null);
      resetBankForm();
      loadBankAccounts();
    } catch (error) {
      console.error('Error saving bank account:', error);
      toast({
        title: "Error",
        description: "Failed to save bank account",
        variant: "destructive",
      });
    }
  };

  const saveUpiAccount = async () => {
    try {
      // If setting as default, unset other defaults
      if (upiForm.is_default) {
        await supabase
          .from('fiat_upi_accounts')
          .update({ is_default: false })
          .neq('id', editingUpi?.id || '');
      }

      const { error } = await supabase
        .from('fiat_upi_accounts')
        .upsert({
          id: editingUpi?.id || undefined,
          ...upiForm
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `UPI account ${editingUpi ? 'updated' : 'created'} successfully`,
      });

      setUpiDialogOpen(false);
      setEditingUpi(null);
      resetUpiForm();
      loadUpiAccounts();
    } catch (error) {
      console.error('Error saving UPI account:', error);
      toast({
        title: "Error",
        description: "Failed to save UPI account",
        variant: "destructive",
      });
    }
  };

  const deleteBankAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fiat_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      });

      loadBankAccounts();
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast({
        title: "Error",
        description: "Failed to delete bank account",
        variant: "destructive",
      });
    }
  };

  const deleteUpiAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fiat_upi_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "UPI account deleted successfully",
      });

      loadUpiAccounts();
    } catch (error) {
      console.error('Error deleting UPI account:', error);
      toast({
        title: "Error",
        description: "Failed to delete UPI account",
        variant: "destructive",
      });
    }
  };

  const resetBankForm = () => {
    setBankForm({
      label: '',
      bank_name: '',
      account_name: '',
      account_number: '',
      ifsc: '',
      notes: '',
      is_active: true,
      is_default: false
    });
  };

  const resetUpiForm = () => {
    setUpiForm({
      label: '',
      upi_id: '',
      upi_name: '',
      notes: '',
      is_active: true,
      is_default: false
    });
  };

  const editBank = (bank: BankAccount) => {
    setEditingBank(bank);
    setBankForm({
      label: bank.label,
      bank_name: bank.bank_name,
      account_name: bank.account_name,
      account_number: bank.account_number,
      ifsc: bank.ifsc,
      notes: bank.notes || '',
      is_active: bank.is_active,
      is_default: bank.is_default
    });
    setBankDialogOpen(true);
  };

  const editUpi = (upi: UpiAccount) => {
    setEditingUpi(upi);
    setUpiForm({
      label: upi.label,
      upi_id: upi.upi_id,
      upi_name: upi.upi_name,
      notes: upi.notes || '',
      is_active: upi.is_active,
      is_default: upi.is_default
    });
    setUpiDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">Loading INR accounts...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Global Settings</TabsTrigger>
          <TabsTrigger value="banks">Bank Accounts ({bankAccounts.length})</TabsTrigger>
          <TabsTrigger value="upi">UPI Accounts ({upiAccounts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>INR Deposit Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settingsForm.enabled}
                  onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, enabled: checked })}
                />
                <Label>Enable INR Deposits</Label>
              </div>

              <div>
                <Label>Minimum Deposit (INR)</Label>
                <Input
                  type="number"
                  value={settingsForm.min_deposit}
                  onChange={(e) => setSettingsForm({ ...settingsForm, min_deposit: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <Label>Fee Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settingsForm.fee_percent}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fee_percent: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <Label>Fixed Fee (INR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settingsForm.fee_fixed}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fee_fixed: parseFloat(e.target.value) })}
                />
              </div>

              <Button onClick={saveSettings}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bank Accounts</CardTitle>
                <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetBankForm(); setEditingBank(null); }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Bank Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingBank ? 'Edit' : 'Add'} Bank Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={bankForm.label}
                          onChange={(e) => setBankForm({ ...bankForm, label: e.target.value })}
                          placeholder="e.g., Main Bank Account"
                        />
                      </div>
                      <div>
                        <Label>Bank Name</Label>
                        <Input
                          value={bankForm.bank_name}
                          onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                          placeholder="e.g., State Bank of India"
                        />
                      </div>
                      <div>
                        <Label>Account Name</Label>
                        <Input
                          value={bankForm.account_name}
                          onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                          placeholder="Account holder name"
                        />
                      </div>
                      <div>
                        <Label>Account Number</Label>
                        <Input
                          value={bankForm.account_number}
                          onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                          placeholder="Account number"
                        />
                      </div>
                      <div>
                        <Label>IFSC Code</Label>
                        <Input
                          value={bankForm.ifsc}
                          onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value })}
                          placeholder="IFSC code"
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={bankForm.notes}
                          onChange={(e) => setBankForm({ ...bankForm, notes: e.target.value })}
                          placeholder="Additional instructions for users"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={bankForm.is_active}
                          onCheckedChange={(checked) => setBankForm({ ...bankForm, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={bankForm.is_default}
                          onCheckedChange={(checked) => setBankForm({ ...bankForm, is_default: checked })}
                        />
                        <Label>Default Account</Label>
                      </div>
                      <Button onClick={saveBankAccount} className="w-full">
                        {editingBank ? 'Update' : 'Create'} Bank Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {bank.label}
                          {bank.is_default && <Star className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{bank.bank_name}</div>
                          <div className="text-muted-foreground">{bank.account_name}</div>
                          <div className="font-mono">{bank.account_number}</div>
                          <div className="font-mono">{bank.ifsc}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={bank.is_active ? "default" : "secondary"}>
                          {bank.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => editBank(bank)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteBankAccount(bank.id)}
                            disabled={bank.is_default}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upi">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>UPI Accounts</CardTitle>
                <Dialog open={upiDialogOpen} onOpenChange={setUpiDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetUpiForm(); setEditingUpi(null); }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add UPI Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingUpi ? 'Edit' : 'Add'} UPI Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={upiForm.label}
                          onChange={(e) => setUpiForm({ ...upiForm, label: e.target.value })}
                          placeholder="e.g., Main UPI"
                        />
                      </div>
                      <div>
                        <Label>UPI ID</Label>
                        <Input
                          value={upiForm.upi_id}
                          onChange={(e) => setUpiForm({ ...upiForm, upi_id: e.target.value })}
                          placeholder="e.g., business@paytm"
                        />
                      </div>
                      <div>
                        <Label>UPI Name</Label>
                        <Input
                          value={upiForm.upi_name}
                          onChange={(e) => setUpiForm({ ...upiForm, upi_name: e.target.value })}
                          placeholder="Account holder name"
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={upiForm.notes}
                          onChange={(e) => setUpiForm({ ...upiForm, notes: e.target.value })}
                          placeholder="Additional instructions for users"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={upiForm.is_active}
                          onCheckedChange={(checked) => setUpiForm({ ...upiForm, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={upiForm.is_default}
                          onCheckedChange={(checked) => setUpiForm({ ...upiForm, is_default: checked })}
                        />
                        <Label>Default Account</Label>
                      </div>
                      <Button onClick={saveUpiAccount} className="w-full">
                        {editingUpi ? 'Update' : 'Create'} UPI Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>UPI Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upiAccounts.map((upi) => (
                    <TableRow key={upi.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {upi.label}
                          {upi.is_default && <Star className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-mono">{upi.upi_id}</div>
                          <div className="text-muted-foreground">{upi.upi_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={upi.is_active ? "default" : "secondary"}>
                          {upi.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => editUpi(upi)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteUpiAccount(upi.id)}
                            disabled={upi.is_default}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminINRAccounts;
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Shield, Loader2 } from "lucide-react";
import { useBeneficiaries } from "@/hooks/useBeneficiaries";

export const BeneficiariesTab = () => {
  const { beneficiaries, allowlist, loading, addBeneficiary, updateAllowlist, removeBeneficiary } = useBeneficiaries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    chain: '',
    address: '',
    note: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addBeneficiary(formData);
      setDialogOpen(false);
      setFormData({ name: '', chain: '', address: '', note: '' });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleToggleAllowlist = async (id: string, enabled: boolean) => {
    try {
      await updateAllowlist(id, { enabled });
    } catch (error) {
      // Error handled in hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Withdrawal Allowlist</span>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Beneficiary
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Beneficiary</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Beneficiary Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., John's Wallet"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Blockchain</Label>
                    <Select 
                      value={formData.chain} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, chain: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blockchain" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEP20">BNB Smart Chain (BEP20)</SelectItem>
                        <SelectItem value="ERC20">Ethereum (ERC20)</SelectItem>
                        <SelectItem value="TRC20">Tron (TRC20)</SelectItem>
                        <SelectItem value="BTC">Bitcoin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter wallet address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Input
                      value={formData.note}
                      onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                      placeholder="Personal note about this address"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Beneficiary</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {beneficiaries.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No beneficiaries added yet</p>
              <p className="text-sm text-muted-foreground">Add trusted addresses for secure withdrawals</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beneficiaries.map((beneficiary) => {
                  const allowlistEntry = allowlist.find(a => 
                    a.address === beneficiary.address && a.chain === beneficiary.chain
                  );
                  
                  return (
                    <TableRow key={beneficiary.id}>
                      <TableCell className="font-medium">{beneficiary.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{beneficiary.chain}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {beneficiary.address.slice(0, 6)}...{beneficiary.address.slice(-4)}
                      </TableCell>
                      <TableCell>
                        {allowlistEntry?.enabled ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={allowlistEntry?.enabled || false}
                            onCheckedChange={(enabled) => 
                              allowlistEntry && handleToggleAllowlist(allowlistEntry.id, enabled)
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeBeneficiary(beneficiary.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What is the Withdrawal Allowlist?</h4>
            <p className="text-sm text-blue-800">
              The allowlist is a security feature that restricts withdrawals to only pre-approved addresses. 
              When enabled in Security settings, you can only withdraw to addresses on this list.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">How to use:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Add trusted wallet addresses as beneficiaries</li>
              <li>2. Enable "Whitelist Only" in Security settings</li>
              <li>3. Withdrawals will only be allowed to active beneficiaries</li>
              <li>4. Toggle addresses on/off as needed</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
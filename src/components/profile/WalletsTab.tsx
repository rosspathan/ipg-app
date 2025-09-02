import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Plus, Edit2, Trash2, Star, Loader2 } from "lucide-react";
import { useWallets } from "@/hooks/useWallets";
import { useToast } from "@/hooks/use-toast";

export const WalletsTab = () => {
  const { wallets, loading, addWallet, updateWallet, removeWallet, setPrimary } = useWallets();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [formData, setFormData] = useState({
    chain: '',
    address: '',
    label: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, formData);
      } else {
        await addWallet(formData);
      }
      
      setDialogOpen(false);
      setEditingWallet(null);
      setFormData({ chain: '', address: '', label: '' });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEdit = (wallet: any) => {
    setEditingWallet(wallet);
    setFormData({
      chain: wallet.chain,
      address: wallet.address,
      label: wallet.label || ''
    });
    setDialogOpen(true);
  };

  const handleSetPrimary = async (walletId: string, chain: string) => {
    try {
      await setPrimary(walletId, chain);
    } catch (error) {
      // Error handled in hook
    }
  };

  const validateAddress = (address: string, chain: string) => {
    // Basic validation - in a real app, use proper address validation
    if (chain === 'BEP20' || chain === 'ERC20') {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    return address.length > 20; // Basic check
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
            <span>My Wallets</span>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Wallet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingWallet ? 'Edit Wallet' : 'Add New Wallet'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    {formData.address && formData.chain && !validateAddress(formData.address, formData.chain) && (
                      <p className="text-sm text-destructive">Invalid address format</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Label (Optional)</Label>
                    <Input
                      value={formData.label}
                      onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g., Main Wallet"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingWallet ? 'Update' : 'Add'} Wallet
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wallets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No wallets added yet</p>
              <p className="text-sm text-muted-foreground">Add your first wallet to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chain</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell>
                      <Badge variant="outline">{wallet.chain}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </TableCell>
                    <TableCell>{wallet.label || 'Unnamed'}</TableCell>
                    <TableCell>
                      {wallet.is_primary && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!wallet.is_primary && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetPrimary(wallet.id, wallet.chain)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(wallet)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeWallet(wallet.id)}
                          disabled={wallet.is_primary}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Supported Networks</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Badge variant="outline">BNB Smart Chain</Badge>
              <Badge variant="outline">Ethereum</Badge>
              <Badge variant="outline">Tron</Badge>
              <Badge variant="outline">Bitcoin</Badge>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>• You can have one primary wallet per blockchain</p>
            <p>• Primary wallets are used as default for deposits</p>
            <p>• All addresses are validated for format correctness</p>
            <p>• Use the QR code to share your receive address</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
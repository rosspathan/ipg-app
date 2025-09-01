import { useState, useEffect } from 'react';
import { Plus, Edit, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FXRate {
  id: string;
  base: string;
  quote: string;
  rate: number;
  updated_at: string;
  created_at: string;
}

const COMMON_CURRENCIES = [
  'USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW'
];

export default function AdminFXRates() {
  const [rates, setRates] = useState<FXRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<FXRate | null>(null);
  
  // Form state
  const [baseCurrency, setBaseCurrency] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('');
  const [rateValue, setRateValue] = useState('');

  useEffect(() => {
    loadRates();
    
    // Set up realtime listener
    const channel = supabase
      .channel('fx-rates-admin')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'fx_rates' },
        () => loadRates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRates = async () => {
    try {
      const { data, error } = await supabase
        .from('fx_rates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setRates(data);
      }
    } catch (error) {
      console.error('Error loading FX rates:', error);
      toast({
        title: "Error",
        description: "Failed to load FX rates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!baseCurrency || !quoteCurrency || !rateValue) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    if (baseCurrency === quoteCurrency) {
      toast({
        title: "Invalid Pair",
        description: "Base and quote currencies cannot be the same",
        variant: "destructive"
      });
      return;
    }

    const rate = parseFloat(rateValue);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid positive rate",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingRate) {
        // Update existing rate
        const { error } = await supabase
          .from('fx_rates')
          .update({
            rate,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRate.id);

        if (error) throw error;
        
        toast({
          title: "Rate Updated",
          description: `${baseCurrency}/${quoteCurrency} rate updated`,
        });
      } else {
        // Create new rate (and inverse)
        const { error: error1 } = await supabase
          .from('fx_rates')
          .upsert({
            base: baseCurrency,
            quote: quoteCurrency,
            rate
          });

        if (error1) throw error1;

        // Create inverse rate
        const { error: error2 } = await supabase
          .from('fx_rates')
          .upsert({
            base: quoteCurrency,
            quote: baseCurrency,
            rate: 1 / rate
          });

        if (error2) throw error2;

        toast({
          title: "Rate Added",
          description: `${baseCurrency}/${quoteCurrency} pair created`,
        });
      }

      // Reset form
      setBaseCurrency('');
      setQuoteCurrency('');
      setRateValue('');
      setEditingRate(null);
      setOpen(false);
      
    } catch (error) {
      console.error('Error saving FX rate:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save FX rate",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (rate: FXRate) => {
    setEditingRate(rate);
    setBaseCurrency(rate.base);
    setQuoteCurrency(rate.quote);
    setRateValue(rate.rate.toString());
    setOpen(true);
  };

  const handleNew = () => {
    setEditingRate(null);
    setBaseCurrency('');
    setQuoteCurrency('');
    setRateValue('');
    setOpen(true);
  };

  const refreshFromAPI = async () => {
    // In a real app, this would fetch from a live FX API
    toast({
      title: "Refresh",
      description: "In production, this would fetch live rates from an FX API",
    });
  };

  if (loading) {
    return <div className="p-4">Loading FX rates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">FX Rates Management</h2>
        <div className="flex gap-2">
          <Button onClick={refreshFromAPI} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Rates
          </Button>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </Button>
        </div>
      </div>

      {/* Current Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Exchange Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No FX rates configured</p>
              <Button onClick={handleNew} className="mt-4">
                Add Your First Rate
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency Pair</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{rate.base}</Badge>
                        <span>/</span>
                        <Badge variant="outline">{rate.quote}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {rate.rate.toFixed(6)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(rate.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(rate)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRate ? 'Edit FX Rate' : 'Add FX Rate'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Currency</Label>
                <Select
                  value={baseCurrency}
                  onValueChange={setBaseCurrency}
                  disabled={!!editingRate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select base" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quote Currency</Label>
                <Select
                  value={quoteCurrency}
                  onValueChange={setQuoteCurrency}
                  disabled={!!editingRate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quote" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Exchange Rate</Label>
              <Input
                type="number"
                placeholder="e.g., 83.50"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                step="0.000001"
                min="0"
              />
              {baseCurrency && quoteCurrency && (
                <p className="text-sm text-muted-foreground">
                  1 {baseCurrency} = {rateValue || '0'} {quoteCurrency}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                {editingRate ? 'Update Rate' : 'Add Rate'}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
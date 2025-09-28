import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Ticket, Gift, Users, Play, StopCircle, Settings, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface DrawConfig {
  id: string;
  title: string;
  description: string;
  pool_size: number;
  ticket_price_inr: number;
  per_user_ticket_cap: number;
  fee_percent: number;
  state: 'draft' | 'open' | 'full' | 'drawing' | 'completed' | 'expired';
  current_participants: number;
  created_at: string;
  updated_at: string;
}

interface DrawTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  pool_size: number;
  ticket_price_inr: number;
  prizes: Array<{rank: string, amount_inr: number}>;
  fee_percent: number;
}

interface DrawTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  status: string;
  bsk_paid: number;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface BSKRate {
  id: string;
  rate_inr_per_bsk: number;
  created_at: string;
  notes: string;
}

const AdminNewLuckyDraw = () => {
  const [draws, setDraws] = useState<DrawConfig[]>([]);
  const [templates, setTemplates] = useState<DrawTemplate[]>([]);
  const [tickets, setTickets] = useState<DrawTicket[]>([]);
  const [bskRates, setBskRates] = useState<BSKRate[]>([]);
  const [selectedDrawId, setSelectedDrawId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingDraw, setEditingDraw] = useState<DrawConfig | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    pool_size: "100",
    ticket_price_inr: "100",
    per_user_ticket_cap: "1",
    fee_percent: "10",
    first_prize: "5000",
    second_prize: "3000",
    third_prize: "2000"
  });

  const [rateForm, setRateForm] = useState({
    rate: "1.0",
    notes: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDrawId) {
      loadTickets(selectedDrawId);
    }
  }, [selectedDrawId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load draws
      const { data: drawsData, error: drawsError } = await supabase
        .from('draw_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (drawsError) throw drawsError;
      setDraws(drawsData || []);

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('draw_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Load BSK rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('bsk_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (ratesError) throw ratesError;
      setBskRates(ratesData || []);

    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async (drawId: string) => {
    try {
      setLoadingTickets(true);
      
      const { data, error } = await supabase
        .from('draw_tickets')
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .eq('draw_id', drawId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading tickets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const createFromTemplate = (template: DrawTemplate) => {
    const prizes = template.prizes;
    setFormData({
      title: template.title,
      description: template.description,
      pool_size: template.pool_size.toString(),
      ticket_price_inr: template.ticket_price_inr.toString(),
      per_user_ticket_cap: "1",
      fee_percent: template.fee_percent.toString(),
      first_prize: (prizes.find(p => p.rank === 'first')?.amount_inr || 5000).toString(),
      second_prize: (prizes.find(p => p.rank === 'second')?.amount_inr || 3000).toString(),
      third_prize: (prizes.find(p => p.rank === 'third')?.amount_inr || 2000).toString()
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Authentication required');
      }

      const drawData = {
        title: formData.title,
        description: formData.description,
        pool_size: parseInt(formData.pool_size),
        ticket_price_inr: parseFloat(formData.ticket_price_inr),
        per_user_ticket_cap: parseInt(formData.per_user_ticket_cap),
        fee_percent: parseFloat(formData.fee_percent),
        state: 'open' as const,
        created_by: user.user.id
      };

      let drawId;
      if (editingDraw) {
        const { error } = await supabase
          .from('draw_configs')
          .update(drawData)
          .eq('id', editingDraw.id);
        
        if (error) throw error;
        drawId = editingDraw.id;

        // Update existing prizes
        await supabase
          .from('draw_prizes')
          .delete()
          .eq('draw_id', drawId);
      } else {
        const { data: newDraw, error } = await supabase
          .from('draw_configs')
          .insert([drawData])
          .select()
          .single();
        
        if (error) throw error;
        drawId = newDraw.id;
      }

      // Create prizes
      const prizesData = [
        { draw_id: drawId, rank: 'first' as const, amount_inr: parseFloat(formData.first_prize) },
        { draw_id: drawId, rank: 'second' as const, amount_inr: parseFloat(formData.second_prize) },
        { draw_id: drawId, rank: 'third' as const, amount_inr: parseFloat(formData.third_prize) }
      ];

      const { error: prizesError } = await supabase
        .from('draw_prizes')
        .insert(prizesData);

      if (prizesError) throw prizesError;

      toast({
        title: "Success",
        description: `Draw ${editingDraw ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetBSKRate = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Authentication required');
      }

      const { error } = await supabase
        .from('bsk_rates')
        .insert([{
          rate_inr_per_bsk: parseFloat(rateForm.rate),
          set_by: user.user.id,
          notes: rateForm.notes
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "BSK rate updated successfully",
      });

      setRateDialogOpen(false);
      setRateForm({ rate: "1.0", notes: "" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExecuteDraw = async (draw: DrawConfig) => {
    if (!confirm(`Execute draw "${draw.title}"? This will randomly select winners and cannot be undone.`)) return;

    try {
      // First commit
      const { data: commitData, error: commitError } = await supabase.functions.invoke('draw-commit', {
        body: { draw_id: draw.id }
      });

      if (commitError) throw commitError;

      // Then reveal
      setTimeout(async () => {
        const { data: revealData, error: revealError } = await supabase.functions.invoke('draw-reveal', {
          body: { draw_id: draw.id }
        });

        if (revealError) {
          toast({
            title: "Error in reveal phase",
            description: revealError.message,
            variant: "destructive",
          });
          return;
        }

        const result = revealData as any;
        if (result?.success) {
          toast({
            title: "Draw Executed Successfully!",
            description: `${result.winners_count} winners selected and prizes distributed.`,
          });
          loadData();
        }
      }, 1000);

    } catch (error: any) {
      toast({
        title: "Draw Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStateChange = async (draw: DrawConfig, newState: string) => {
    try {
      const { error } = await supabase
        .from('draw_configs')
        .update({ state: newState })
        .eq('id', draw.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Draw ${newState} successfully`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      pool_size: "100",
      ticket_price_inr: "100",
      per_user_ticket_cap: "1",
      fee_percent: "10",
      first_prize: "5000",
      second_prize: "3000",
      third_prize: "2000"
    });
    setEditingDraw(null);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'full': return 'bg-blue-100 text-blue-800';
      case 'drawing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                BSK Lucky Draw Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage provably fair BSK-only lucky draws with commit-reveal randomness
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Set BSK Rate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update BSK Exchange Rate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Rate (INR per BSK)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rateForm.rate}
                        onChange={(e) => setRateForm({...rateForm, rate: e.target.value})}
                        placeholder="1.0"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: {bskRates[0]?.rate_inr_per_bsk || 1} INR per BSK
                      </p>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={rateForm.notes}
                        onChange={(e) => setRateForm({...rateForm, notes: e.target.value})}
                        placeholder="Reason for rate change..."
                      />
                    </div>
                    <Button onClick={handleSetBSKRate} className="w-full">
                      Update Rate
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Draw
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDraw ? "Edit Draw" : "Create New Draw"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Classic 100 × ₹100"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Describe the draw..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Pool Size</Label>
                        <Input
                          type="number"
                          value={formData.pool_size}
                          onChange={(e) => setFormData({...formData, pool_size: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Ticket Price (₹)</Label>
                        <Input
                          type="number"
                          value={formData.ticket_price_inr}
                          onChange={(e) => setFormData({...formData, ticket_price_inr: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Per User Limit</Label>
                        <Input
                          type="number"
                          value={formData.per_user_ticket_cap}
                          onChange={(e) => setFormData({...formData, per_user_ticket_cap: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Admin Fee (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.fee_percent}
                          onChange={(e) => setFormData({...formData, fee_percent: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Prize Structure (₹)</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">🥇 First</Label>
                          <Input
                            type="number"
                            value={formData.first_prize}
                            onChange={(e) => setFormData({...formData, first_prize: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">🥈 Second</Label>
                          <Input
                            type="number"
                            value={formData.second_prize}
                            onChange={(e) => setFormData({...formData, second_prize: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">🥉 Third</Label>
                          <Input
                            type="number"
                            value={formData.third_prize}
                            onChange={(e) => setFormData({...formData, third_prize: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave}>
                        {editingDraw ? "Update" : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="draws" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draws">Active Draws</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="draws" className="space-y-4">
            {draws.length > 0 ? (
              <div className="space-y-4">
                {draws.map((draw) => (
                  <Card key={draw.id} className="bg-gradient-card shadow-card border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{draw.title}</h3>
                            <Badge className={getStateColor(draw.state)}>
                              {draw.state.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Participants:</span>
                              <p className="font-medium">{draw.current_participants}/{draw.pool_size}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Ticket Price:</span>
                              <p className="font-medium">₹{draw.ticket_price_inr}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Fee:</span>
                              <p className="font-medium">{draw.fee_percent}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>
                              <p className="font-medium">{new Date(draw.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {draw.state === 'full' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleExecuteDraw(draw)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Execute
                            </Button>
                          )}
                          {draw.state === 'open' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStateChange(draw, 'expired')}
                            >
                              <StopCircle className="h-4 w-4 mr-1" />
                              Close
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingDraw(draw);
                              setFormData({
                                title: draw.title,
                                description: draw.description || "",
                                pool_size: draw.pool_size.toString(),
                                ticket_price_inr: draw.ticket_price_inr.toString(),
                                per_user_ticket_cap: draw.per_user_ticket_cap.toString(),
                                fee_percent: draw.fee_percent.toString(),
                                first_prize: "5000",
                                second_prize: "3000", 
                                third_prize: "2000"
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No draws created yet. Create your first draw to get started.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="bg-gradient-card shadow-card border-0">
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">{template.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Pool Size:</span>
                        <span>{template.pool_size} participants</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ticket Price:</span>
                        <span>₹{template.ticket_price_inr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Admin Fee:</span>
                        <span>{template.fee_percent}%</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => createFromTemplate(template)}
                      className="w-full mt-3"
                      variant="outline"
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedDrawId} onValueChange={setSelectedDrawId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a draw to view tickets..." />
                </SelectTrigger>
                <SelectContent>
                  {draws.map((draw) => (
                    <SelectItem key={draw.id} value={draw.id}>
                      {draw.title} ({draw.current_participants} tickets)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDrawId && (
              <Card>
                <CardContent className="p-0">
                  {loadingTickets ? (
                    <div className="flex items-center justify-center h-32">Loading tickets...</div>
                  ) : tickets.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket #</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>BSK Paid</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tickets.map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="font-mono text-sm">
                              {ticket.ticket_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{ticket.profiles?.full_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{ticket.profiles?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStateColor(ticket.status)}>
                                {ticket.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{ticket.bsk_paid.toFixed(2)} BSK</TableCell>
                            <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No tickets found for this draw.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      </Card>
    </div>
  );
};

export default AdminNewLuckyDraw;
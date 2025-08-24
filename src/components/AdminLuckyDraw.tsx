import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Ticket, DollarSign, Users, Calendar, Trophy } from "lucide-react";

interface LuckyDrawConfig {
  id: string;
  prize_pool: number;
  status: string;
  created_at: string;
  max_winners: number;
  draw_date: string;
  ticket_price: number;
}

export const AdminLuckyDraw = () => {
  const [draws, setDraws] = useState<LuckyDrawConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDraw, setEditingDraw] = useState<LuckyDrawConfig | null>(null);
  const [formData, setFormData] = useState({
    prize_pool: "",
    ticket_price: "",
    max_winners: "",
    draw_date: "",
    status: "active",
  });
  const { toast } = useToast();

  const loadDraws = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("lucky_draw_configs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDraws(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading draws",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraws();
  }, []);

  const resetForm = () => {
    setFormData({
      prize_pool: "",
      ticket_price: "",
      max_winners: "",
      draw_date: "",
      status: "active",
    });
    setEditingDraw(null);
  };

  const handleEdit = (draw: LuckyDrawConfig) => {
    setEditingDraw(draw);
    setFormData({
      prize_pool: draw.prize_pool.toString(),
      ticket_price: draw.ticket_price.toString(),
      max_winners: draw.max_winners.toString(),
      draw_date: new Date(draw.draw_date).toISOString().slice(0, 16),
      status: draw.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const drawData = {
        prize_pool: parseFloat(formData.prize_pool),
        ticket_price: parseFloat(formData.ticket_price),
        max_winners: parseInt(formData.max_winners),
        draw_date: new Date(formData.draw_date).toISOString(),
        status: formData.status,
      };

      let response;
      if (editingDraw) {
        response = await supabase
          .from("lucky_draw_configs")
          .update(drawData)
          .eq("id", editingDraw.id);

        // Log the admin action
        await supabase.rpc("log_admin_action", {
          p_action: "update_lucky_draw",
          p_resource_type: "lucky_draw_configs",
          p_resource_id: editingDraw.id,
          p_old_values: JSON.parse(JSON.stringify(editingDraw)),
          p_new_values: JSON.parse(JSON.stringify({ ...editingDraw, ...drawData })),
        });
      } else {
        response = await supabase.from("lucky_draw_configs").insert([drawData]);

        // Log the admin action
        await supabase.rpc("log_admin_action", {
          p_action: "create_lucky_draw",
          p_resource_type: "lucky_draw_configs",
          p_new_values: JSON.parse(JSON.stringify(drawData)),
        });
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Lucky draw ${editingDraw ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      loadDraws();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (draw: LuckyDrawConfig, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("lucky_draw_configs")
        .update({ status: newStatus })
        .eq("id", draw.id);

      if (error) throw error;

      // Log the admin action
      await supabase.rpc("log_admin_action", {
        p_action: `${newStatus}_lucky_draw`,
        p_resource_type: "lucky_draw_configs",
        p_resource_id: draw.id,
        p_old_values: JSON.parse(JSON.stringify(draw)),
        p_new_values: JSON.parse(JSON.stringify({ ...draw, status: newStatus })),
      });

      toast({
        title: "Success",
        description: `Lucky draw ${newStatus} successfully`,
      });

      loadDraws();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (draw: LuckyDrawConfig) => {
    if (!confirm("Are you sure you want to delete this lucky draw? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from("lucky_draw_configs").delete().eq("id", draw.id);

      if (error) throw error;

      // Log the admin action
      await supabase.rpc("log_admin_action", {
        p_action: "delete_lucky_draw",
        p_resource_type: "lucky_draw_configs",
        p_resource_id: draw.id,
        p_old_values: JSON.parse(JSON.stringify(draw)),
      });

      toast({
        title: "Success",
        description: "Lucky draw deleted successfully",
      });

      loadDraws();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isDrawPast = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading lucky draws...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Lucky Draw Configuration
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure lottery draws, prizes, schedules, and ticket pricing
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Draw
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingDraw ? "Edit Lucky Draw" : "Create New Lucky Draw"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="prize_pool">Prize Pool (USDT)</Label>
                  <Input
                    id="prize_pool"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prize_pool}
                    onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                    placeholder="e.g., 1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticket_price">Ticket Price (USDT)</Label>
                  <Input
                    id="ticket_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.ticket_price}
                    onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                    placeholder="e.g., 10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_winners">Maximum Winners</Label>
                  <Input
                    id="max_winners"
                    type="number"
                    min="1"
                    value={formData.max_winners}
                    onChange={(e) => setFormData({ ...formData, max_winners: e.target.value })}
                    placeholder="e.g., 3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="draw_date">Draw Date & Time</Label>
                  <Input
                    id="draw_date"
                    type="datetime-local"
                    value={formData.draw_date}
                    onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingDraw ? "Update" : "Create"} Draw
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {draws.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No lucky draws found. Create your first draw to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {draws.map((draw) => (
              <div key={draw.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">Draw #{draw.id.slice(0, 8)}</h3>
                    <Badge variant={getStatusColor(draw.status)}>
                      {draw.status.charAt(0).toUpperCase() + draw.status.slice(1)}
                    </Badge>
                    {isDrawPast(draw.draw_date) && draw.status === 'active' && (
                      <Badge variant="outline" className="text-orange-500">
                        Past Due
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {draw.status === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(draw, 'completed')}
                        >
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(draw, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(draw)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(draw)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-muted-foreground">Prize Pool</p>
                      <p className="font-semibold">{draw.prize_pool.toLocaleString()} USDT</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-muted-foreground">Ticket Price</p>
                      <p className="font-semibold">{draw.ticket_price} USDT</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-muted-foreground">Max Winners</p>
                      <p className="font-semibold">{draw.max_winners}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-muted-foreground">Draw Date</p>
                      <p className="font-semibold text-xs">{formatDate(draw.draw_date)}</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />
                
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    Created: {formatDate(draw.created_at)}
                  </div>
                  <div className="text-muted-foreground">
                    Max Tickets: {Math.floor(draw.prize_pool / draw.ticket_price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
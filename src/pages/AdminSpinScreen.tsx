import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Settings, BarChart3, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpinWheel {
  id: string;
  name: string;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  ticket_price: number;
  ticket_currency: string;
  free_spins_daily: number;
  vip_multiplier: number;
  cooldown_seconds: number;
  max_spins_per_user: number;
  seed: string | null;
  created_at: string;
}

interface SpinSegment {
  id: string;
  wheel_id: string;
  label: string;
  weight: number;
  reward_type: string;
  reward_value: number | null;
  reward_token: string | null;
  max_per_day: number;
  max_total: number;
  is_enabled: boolean;
  color: string | null;
}

export default function AdminSpinScreen() {
  const { toast } = useToast();
  const [wheels, setWheels] = useState<SpinWheel[]>([]);
  const [segments, setSegments] = useState<SpinSegment[]>([]);
  const [selectedWheel, setSelectedWheel] = useState<string | null>(null);
  const [isWheelDialogOpen, setIsWheelDialogOpen] = useState(false);
  const [isSegmentDialogOpen, setIsSegmentDialogOpen] = useState(false);
  const [editingWheel, setEditingWheel] = useState<SpinWheel | null>(null);
  const [editingSegment, setEditingSegment] = useState<SpinSegment | null>(null);

  const [wheelForm, setWheelForm] = useState({
    name: "",
    is_active: true,
    start_at: "",
    end_at: "",
    ticket_price: 0,
    ticket_currency: "USDT",
    free_spins_daily: 1,
    vip_multiplier: 1,
    cooldown_seconds: 86400,
    max_spins_per_user: 0,
    seed: ""
  });

  const [segmentForm, setSegmentForm] = useState({
    label: "",
    weight: 10,
    reward_type: "nothing",
    reward_value: 0,
    reward_token: "",
    max_per_day: 0,
    max_total: 0,
    is_enabled: true,
    color: ""
  });

  useEffect(() => {
    loadWheels();
  }, []);

  useEffect(() => {
    if (selectedWheel) {
      loadSegments(selectedWheel);
    }
  }, [selectedWheel]);

  const loadWheels = async () => {
    try {
      const { data, error } = await supabase
        .from("spin_wheels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWheels(data || []);
      
      if (data && data.length > 0 && !selectedWheel) {
        setSelectedWheel(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load wheels",
        variant: "destructive"
      });
    }
  };

  const loadSegments = async (wheelId: string) => {
    try {
      const { data, error } = await supabase
        .from("spin_segments")
        .select("*")
        .eq("wheel_id", wheelId)
        .order("weight", { ascending: false });

      if (error) throw error;
      setSegments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load segments",
        variant: "destructive"
      });
    }
  };

  const handleSaveWheel = async () => {
    try {
      const wheelData = {
        ...wheelForm,
        start_at: wheelForm.start_at || null,
        end_at: wheelForm.end_at || null,
        seed: wheelForm.seed || crypto.randomUUID()
      };

      if (editingWheel) {
        const { error } = await supabase
          .from("spin_wheels")
          .update(wheelData)
          .eq("id", editingWheel.id);
        
        if (error) throw error;
        toast({ title: "Success", description: "Wheel updated successfully" });
      } else {
        const { error } = await supabase
          .from("spin_wheels")
          .insert([wheelData]);
        
        if (error) throw error;
        toast({ title: "Success", description: "Wheel created successfully" });
      }

      setIsWheelDialogOpen(false);
      setEditingWheel(null);
      resetWheelForm();
      loadWheels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveSegment = async () => {
    if (!selectedWheel) return;

    try {
      const segmentData = {
        ...segmentForm,
        wheel_id: selectedWheel,
        reward_value: segmentForm.reward_type === "nothing" ? null : segmentForm.reward_value,
        reward_token: segmentForm.reward_type === "token" ? segmentForm.reward_token : null
      };

      if (editingSegment) {
        const { error } = await supabase
          .from("spin_segments")
          .update(segmentData)
          .eq("id", editingSegment.id);
        
        if (error) throw error;
        toast({ title: "Success", description: "Segment updated successfully" });
      } else {
        const { error } = await supabase
          .from("spin_segments")
          .insert([segmentData]);
        
        if (error) throw error;
        toast({ title: "Success", description: "Segment created successfully" });
      }

      setIsSegmentDialogOpen(false);
      setEditingSegment(null);
      resetSegmentForm();
      loadSegments(selectedWheel);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteWheel = async (wheelId: string) => {
    if (!confirm("Are you sure you want to delete this wheel?")) return;

    try {
      const { error } = await supabase
        .from("spin_wheels")
        .delete()
        .eq("id", wheelId);

      if (error) throw error;
      toast({ title: "Success", description: "Wheel deleted successfully" });
      loadWheels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm("Are you sure you want to delete this segment?")) return;

    try {
      const { error } = await supabase
        .from("spin_segments")
        .delete()
        .eq("id", segmentId);

      if (error) throw error;
      toast({ title: "Success", description: "Segment deleted successfully" });
      if (selectedWheel) loadSegments(selectedWheel);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetWheelForm = () => {
    setWheelForm({
      name: "",
      is_active: true,
      start_at: "",
      end_at: "",
      ticket_price: 0,
      ticket_currency: "USDT",
      free_spins_daily: 1,
      vip_multiplier: 1,
      cooldown_seconds: 86400,
      max_spins_per_user: 0,
      seed: ""
    });
  };

  const resetSegmentForm = () => {
    setSegmentForm({
      label: "",
      weight: 25,
      reward_type: "token",
      reward_value: 5,
      reward_token: "BSK",
      max_per_day: 0,
      max_total: 0,
      is_enabled: true,
      color: "#00ff88"
    });
  };

  const editWheel = (wheel: SpinWheel) => {
    setEditingWheel(wheel);
    setWheelForm({
      name: wheel.name,
      is_active: wheel.is_active,
      start_at: wheel.start_at ? wheel.start_at.split('T')[0] + 'T' + wheel.start_at.split('T')[1].slice(0, 5) : "",
      end_at: wheel.end_at ? wheel.end_at.split('T')[0] + 'T' + wheel.end_at.split('T')[1].slice(0, 5) : "",
      ticket_price: wheel.ticket_price,
      ticket_currency: wheel.ticket_currency,
      free_spins_daily: wheel.free_spins_daily,
      vip_multiplier: wheel.vip_multiplier,
      cooldown_seconds: wheel.cooldown_seconds,
      max_spins_per_user: wheel.max_spins_per_user,
      seed: wheel.seed || ""
    });
    setIsWheelDialogOpen(true);
  };

  const editSegment = (segment: SpinSegment) => {
    setEditingSegment(segment);
    setSegmentForm({
      label: segment.label,
      weight: segment.weight,
      reward_type: segment.reward_type,
      reward_value: segment.reward_value || 0,
      reward_token: segment.reward_token || "",
      max_per_day: segment.max_per_day,
      max_total: segment.max_total,
      is_enabled: segment.is_enabled,
      color: segment.color || ""
    });
    setIsSegmentDialogOpen(true);
  };

  const getTotalWeight = () => segments.filter(s => s.is_enabled).reduce((sum, s) => sum + s.weight, 0);
  const getSegmentProbability = (weight: number) => {
    const total = getTotalWeight();
    return total > 0 ? ((weight / total) * 100).toFixed(1) : "0";
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Spin Wheel Management</h1>
          <p className="text-muted-foreground">Configure wheels, segments, and monitor activity</p>
        </div>
      </div>

      <Tabs defaultValue="wheels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="wheels">Wheels</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="runs">Runs & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="wheels" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Spin Wheels</CardTitle>
              <Dialog open={isWheelDialogOpen} onOpenChange={setIsWheelDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetWheelForm(); setEditingWheel(null); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Wheel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingWheel ? "Edit Wheel" : "Create Wheel"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={wheelForm.name}
                          onChange={(e) => setWheelForm({...wheelForm, name: e.target.value})}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={wheelForm.is_active}
                          onCheckedChange={(checked) => setWheelForm({...wheelForm, is_active: checked})}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start_at">Start Time</Label>
                        <Input
                          id="start_at"
                          type="datetime-local"
                          value={wheelForm.start_at}
                          onChange={(e) => setWheelForm({...wheelForm, start_at: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_at">End Time</Label>
                        <Input
                          id="end_at"
                          type="datetime-local"
                          value={wheelForm.end_at}
                          onChange={(e) => setWheelForm({...wheelForm, end_at: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ticket_price">Ticket Price</Label>
                        <Input
                          id="ticket_price"
                          type="number"
                          step="0.01"
                          value={wheelForm.ticket_price}
                          onChange={(e) => setWheelForm({...wheelForm, ticket_price: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ticket_currency">Currency</Label>
                        <Select value={wheelForm.ticket_currency} onValueChange={(value) => setWheelForm({...wheelForm, ticket_currency: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USDT">USDT</SelectItem>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="BTC">BTC</SelectItem>
                            <SelectItem value="ETH">ETH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="free_spins_daily">Free Spins Daily</Label>
                        <Input
                          id="free_spins_daily"
                          type="number"
                          value={wheelForm.free_spins_daily}
                          onChange={(e) => setWheelForm({...wheelForm, free_spins_daily: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vip_multiplier">VIP Multiplier</Label>
                        <Input
                          id="vip_multiplier"
                          type="number"
                          step="0.1"
                          value={wheelForm.vip_multiplier}
                          onChange={(e) => setWheelForm({...wheelForm, vip_multiplier: parseFloat(e.target.value) || 1})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cooldown_seconds">Cooldown (seconds)</Label>
                        <Input
                          id="cooldown_seconds"
                          type="number"
                          value={wheelForm.cooldown_seconds}
                          onChange={(e) => setWheelForm({...wheelForm, cooldown_seconds: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="max_spins_per_user">Max Spins Per User (0 = unlimited)</Label>
                        <Input
                          id="max_spins_per_user"
                          type="number"
                          value={wheelForm.max_spins_per_user}
                          onChange={(e) => setWheelForm({...wheelForm, max_spins_per_user: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="seed">Seed (optional)</Label>
                        <Input
                          id="seed"
                          value={wheelForm.seed}
                          onChange={(e) => setWheelForm({...wheelForm, seed: e.target.value})}
                          placeholder="Auto-generated if empty"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsWheelDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveWheel}>
                      {editingWheel ? "Update" : "Create"} Wheel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wheels.map((wheel) => (
                  <div key={wheel.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{wheel.name}</h3>
                        <Badge variant={wheel.is_active ? "default" : "secondary"}>
                          {wheel.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Price: {wheel.ticket_price} {wheel.ticket_currency} | 
                        Free: {wheel.free_spins_daily}/day | 
                        Cooldown: {wheel.cooldown_seconds}s
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWheel(wheel.id)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editWheel(wheel)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteWheel(wheel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          {selectedWheel ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>
                    Segments for {wheels.find(w => w.id === selectedWheel)?.name}
                  </CardTitle>
                  <Dialog open={isSegmentDialogOpen} onOpenChange={setIsSegmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { resetSegmentForm(); setEditingSegment(null); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Segment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingSegment ? "Edit Segment" : "Create Segment"}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="label">Label</Label>
                            <Input
                              id="label"
                              value={segmentForm.label}
                              onChange={(e) => setSegmentForm({...segmentForm, label: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="weight">Weight</Label>
                            <Input
                              id="weight"
                              type="number"
                              value={segmentForm.weight}
                              onChange={(e) => setSegmentForm({...segmentForm, weight: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="reward_type">Reward Type</Label>
                            <Select value={segmentForm.reward_type} onValueChange={(value) => setSegmentForm({...segmentForm, reward_type: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nothing">Nothing</SelectItem>
                                <SelectItem value="token">Token</SelectItem>
                                <SelectItem value="coupon">Coupon</SelectItem>
                                <SelectItem value="percent_bonus">Percent Bonus</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="reward_value">Reward Value</Label>
                            <Input
                              id="reward_value"
                              type="number"
                              step="0.01"
                              value={segmentForm.reward_value}
                              onChange={(e) => setSegmentForm({...segmentForm, reward_value: parseFloat(e.target.value) || 0})}
                              disabled={segmentForm.reward_type === "nothing"}
                            />
                          </div>
                        </div>

                        {segmentForm.reward_type === "token" && (
                          <div>
                            <Label htmlFor="reward_token">Token Symbol</Label>
                            <Input
                              id="reward_token"
                              value={segmentForm.reward_token}
                              onChange={(e) => setSegmentForm({...segmentForm, reward_token: e.target.value})}
                              placeholder="e.g., USDT, BTC"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="max_per_day">Max Per Day (0 = unlimited)</Label>
                            <Input
                              id="max_per_day"
                              type="number"
                              value={segmentForm.max_per_day}
                              onChange={(e) => setSegmentForm({...segmentForm, max_per_day: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="max_total">Max Total (0 = unlimited)</Label>
                            <Input
                              id="max_total"
                              type="number"
                              value={segmentForm.max_total}
                              onChange={(e) => setSegmentForm({...segmentForm, max_total: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="color">Color (optional)</Label>
                            <Input
                              id="color"
                              value={segmentForm.color}
                              onChange={(e) => setSegmentForm({...segmentForm, color: e.target.value})}
                              placeholder="#FF5733"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={segmentForm.is_enabled}
                              onCheckedChange={(checked) => setSegmentForm({...segmentForm, is_enabled: checked})}
                            />
                            <Label>Enabled</Label>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsSegmentDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveSegment}>
                          {editingSegment ? "Update" : "Create"} Segment
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {segments.map((segment) => (
                      <div key={segment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{segment.label}</h4>
                            <Badge variant={segment.is_enabled ? "default" : "secondary"}>
                              {getSegmentProbability(segment.weight)}%
                            </Badge>
                            {!segment.is_enabled && (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Weight: {segment.weight} | 
                            Reward: {segment.reward_type === "nothing" ? "None" : `${segment.reward_value} ${segment.reward_token || segment.reward_type}`}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editSegment(segment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSegment(segment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {segments.length > 0 && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="text-sm">
                        <strong>Total Weight:</strong> {getTotalWeight()} | 
                        <strong> Active Segments:</strong> {segments.filter(s => s.is_enabled).length}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Select a Wheel</h3>
                <p className="text-muted-foreground">
                  Choose a wheel from the Wheels tab to manage its segments
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="runs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Runs & Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Spin runs analytics and reporting will be displayed here. This includes user activity, 
                reward distribution, revenue tracking, and detailed spin history.
              </p>
              <div className="mt-4">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
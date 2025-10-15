import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  display_order: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export default function AdminAnnouncementsManager() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'info',
    display_order: 0,
    status: 'active',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/app/home');
      return;
    }
    fetchAnnouncements();
  }, [isAdmin, navigate]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('display_order', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null
    };

    if (editingId) {
      const { error } = await supabase
        .from('announcements')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        toast({ title: "Error updating announcement", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Announcement updated" });
        resetForm();
        fetchAnnouncements();
      }
    } else {
      const { error } = await supabase
        .from('announcements')
        .insert([payload]);

      if (error) {
        toast({ title: "Error creating announcement", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Announcement created" });
        resetForm();
        fetchAnnouncements();
      }
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      announcement_type: announcement.announcement_type,
      display_order: announcement.display_order,
      status: announcement.status,
      start_date: announcement.start_date || '',
      end_date: announcement.end_date || ''
    });
    setEditingId(announcement.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Announcement deleted" });
      fetchAnnouncements();
    }
  };

  const handleToggleActive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('announcements')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchAnnouncements();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      announcement_type: 'info',
      display_order: 0,
      status: 'active',
      start_date: '',
      end_date: ''
    });
    setEditingId(null);
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Announcements Manager
          </h1>
          <p className="text-muted-foreground mt-1">Manage app-wide announcements</p>
        </div>
      </div>

      {/* Create/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Announcement' : 'Create New Announcement'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter announcement title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.announcement_type} onValueChange={(v) => setFormData({ ...formData, announcement_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter announcement message"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date (Optional)</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                {editingId ? 'Update' : 'Create'} Announcement
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No announcements yet. Create one above!
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      <Badge variant={announcement.status === 'active' ? "default" : "secondary"}>
                        {announcement.status}
                      </Badge>
                      <Badge variant="outline">{announcement.announcement_type}</Badge>
                      <Badge variant="outline">Order: {announcement.display_order}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {format(new Date(announcement.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(announcement.id, announcement.status)}
                    >
                      {announcement.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

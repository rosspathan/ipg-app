import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Upload, ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CarouselImage {
  id: string;
  image_url: string;
  link_url?: string;
  title?: string;
  display_order: number;
  status: string;
  created_at: string;
}

export default function AdminCarouselManager() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    image_url: "",
    link_url: "",
    title: "",
    display_order: 0,
    status: "active"
  });

  const { data: carousels, isLoading } = useQuery({
    queryKey: ['admin-carousels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_carousels')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CarouselImage[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('image_carousels')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-carousels'] });
      toast.success('Carousel image added successfully');
      setFormData({
        image_url: "",
        link_url: "",
        title: "",
        display_order: 0,
        status: "active"
      });
    },
    onError: (error) => {
      toast.error('Failed to add carousel image: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('image_carousels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-carousels'] });
      toast.success('Carousel image deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('image_carousels')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-carousels'] });
      toast.success('Status updated');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url) {
      toast.error('Image URL is required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Carousel Manager</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Carousel Image</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Image URL *</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Upload image to Supabase Storage and paste the public URL here
              </p>
            </div>

            <div>
              <Label>Title (Optional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Banner title"
              />
            </div>

            <div>
              <Label>Link URL (Optional)</Label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://example.com/destination"
              />
            </div>

            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                min="0"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={createMutation.isPending}>
              <Upload className="w-4 h-4 mr-2" />
              Add Carousel Image
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Carousels ({carousels?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : carousels?.length === 0 ? (
            <p className="text-muted-foreground">No carousel images yet</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {carousels?.map((carousel) => (
                <Card key={carousel.id} className="overflow-hidden">
                  <img 
                    src={carousel.image_url} 
                    alt={carousel.title || 'Carousel'} 
                    className="w-full h-40 object-cover"
                  />
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{carousel.title || 'Untitled'}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        carousel.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {carousel.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Order: {carousel.display_order}
                    </div>
                    {carousel.link_url && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{carousel.link_url}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleStatusMutation.mutate({ id: carousel.id, status: carousel.status })}
                      >
                        {carousel.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Delete this carousel image?')) {
                            deleteMutation.mutate(carousel.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

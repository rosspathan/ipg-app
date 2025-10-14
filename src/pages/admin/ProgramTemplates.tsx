import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Download, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProgramTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  template_config: any;
  template_schema: any;
  icon?: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

export default function ProgramTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "games",
    template_config: "{}",
    template_schema: "{}"
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['program-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .order('usage_count', { ascending: false });
      
      if (error) throw error;
      return data as ProgramTemplate[];
    }
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('program_templates')
        .insert([{
          ...newTemplate,
          template_config: JSON.parse(newTemplate.template_config),
          template_schema: JSON.parse(newTemplate.template_schema),
          created_by: user.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-templates'] });
      toast({ title: "Template created successfully" });
      setShowNewTemplateDialog(false);
      setNewTemplate({
        name: "",
        description: "",
        category: "games",
        template_config: "{}",
        template_schema: "{}"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create template", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleUseTemplate = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const template = templates?.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Increment usage count
      await supabase
        .from('program_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', templateId);

      // Navigate to create new program with template data
      navigate('/admin/programs/editor/new', { 
        state: { 
          template: template 
        } 
      });
    } catch (error: any) {
      toast({
        title: "Failed to use template",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading templates...</div>
      </div>
    );
  }

  const categories = [...new Set(templates?.map(t => t.category) || [])];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/programs/control-center')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Program Templates</h1>
            <p className="text-muted-foreground">Pre-configured templates to quickly create new programs</p>
          </div>
        </div>
        <Button onClick={() => setShowNewTemplateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Templates by Category */}
      {categories.map(category => {
        const categoryTemplates = templates?.filter(t => t.category === category);
        return (
          <div key={category} className="space-y-4">
            <h2 className="text-2xl font-semibold capitalize">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTemplates?.map(template => (
                <Card key={template.id} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{template.icon || '📦'}</div>
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-xs text-muted-foreground">Used {template.usage_count} times</p>
                      </div>
                    </div>
                    {template.is_public && <Badge>Public</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description || 'No description'}</p>
                  <Button className="w-full" onClick={() => handleUseTemplate(template.id)}>
                    Use Template
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* New Template Dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>Create a reusable template for program creation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Template Name</label>
              <Input 
                value={newTemplate.name} 
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="e.g., Lucky Spin Template"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={newTemplate.description} 
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="Describe what this template does..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={newTemplate.category} onValueChange={(val) => setNewTemplate({...newTemplate, category: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="games">Games</SelectItem>
                  <SelectItem value="rewards">Rewards</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Template Config (JSON)</label>
              <Textarea 
                value={newTemplate.template_config}
                onChange={(e) => setNewTemplate({...newTemplate, template_config: e.target.value})}
                placeholder='{"key": "value"}'
                className="font-mono text-sm"
                rows={5}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Template Schema (JSON)</label>
              <Textarea 
                value={newTemplate.template_schema}
                onChange={(e) => setNewTemplate({...newTemplate, template_schema: e.target.value})}
                placeholder='{"type": "object", "properties": {}}'
                className="font-mono text-sm"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>Cancel</Button>
            <Button onClick={() => createTemplate.mutate()}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

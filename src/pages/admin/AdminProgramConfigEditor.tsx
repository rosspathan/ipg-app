import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProgramModule {
  id: string;
  name: string;
  key: string;
}

export default function AdminProgramConfigEditor() {
  const queryClient = useQueryClient();
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [configJson, setConfigJson] = useState<string>("{}");

  // Fetch all program modules
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['program-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_modules')
        .select('id, name, key')
        .eq('status', 'live')
        .order('name');
      
      if (error) throw error;
      return data as ProgramModule[];
    }
  });

  // Fetch current config for selected module
  const { data: currentConfig, refetch: refetchConfig } = useQuery({
    queryKey: ['program-config', selectedModuleId],
    queryFn: async () => {
      if (!selectedModuleId) return null;
      
      const { data, error } = await supabase
        .from('program_configs')
        .select('*')
        .eq('module_id', selectedModuleId)
        .eq('is_current', true)
        .eq('status', 'published')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedModuleId
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ moduleId, config }: { moduleId: string; config: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parse the JSON to validate
      const parsedConfig = JSON.parse(config);

      // Create new config version
      const { data, error } = await supabase
        .from('program_configs')
        .insert({
          module_id: moduleId,
          config_json: parsedConfig,
          schema_json: {},
          status: 'draft',
          created_by: user.id,
          notes: 'Admin config update'
        })
        .select()
        .single();

      if (error) throw error;

      // Publish the config
      const { error: publishError } = await supabase
        .rpc('publish_program_config', {
          p_config_id: data.id,
          p_operator_id: user.id
        });

      if (publishError) throw publishError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-config'] });
      queryClient.invalidateQueries({ queryKey: ['program-modules'] });
      toast.success('Configuration updated and published successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update configuration: ' + error.message);
    }
  });

  const handleModuleChange = (moduleId: string) => {
    setSelectedModuleId(moduleId);
  };

  const handleSave = () => {
    if (!selectedModuleId) {
      toast.error('Please select a program module');
      return;
    }

    try {
      JSON.parse(configJson); // Validate JSON
      updateConfigMutation.mutate({ moduleId: selectedModuleId, config: configJson });
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };

  const loadCurrentConfig = () => {
    if (currentConfig) {
      setConfigJson(JSON.stringify(currentConfig.config_json, null, 2));
    } else {
      setConfigJson(JSON.stringify({
        enabled: true,
        subscription_cost: 100,
        daily_reward: 5,
        max_per_user: 10,
        description: "Configure program parameters here"
      }, null, 2));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Program Configuration Editor</h1>
          <p className="text-muted-foreground mt-2">
            Edit JSON configuration for all programs. Changes are published instantly to users.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Program Module</CardTitle>
          <CardDescription>
            Choose a program to edit its configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Program Module</Label>
            <Select value={selectedModuleId} onValueChange={handleModuleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a program..." />
              </SelectTrigger>
              <SelectContent>
                {modules?.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.name} ({module.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedModuleId && (
            <>
              <div className="flex gap-2">
                <Button onClick={loadCurrentConfig} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load Current Config
                </Button>
                <Button onClick={() => refetchConfig()} variant="outline">
                  Refresh
                </Button>
              </div>

              <div>
                <Label>Configuration JSON</Label>
                <Textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  className="font-mono text-xs min-h-[400px]"
                  placeholder="Enter JSON configuration..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Common fields: subscription_cost, daily_reward, entry_fee, ticket_price, min_bet, max_per_user
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSave} 
                  disabled={updateConfigMutation.isPending}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateConfigMutation.isPending ? 'Publishing...' : 'Save & Publish'}
                </Button>
              </div>

              {currentConfig && (
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="text-sm">Current Published Config</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs overflow-auto max-h-[200px]">
                      {JSON.stringify(currentConfig.config_json, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-sm">Configuration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div><strong>Ad Mining:</strong> subscription_cost, daily_reward, duration_days</div>
          <div><strong>Lucky Draw:</strong> ticket_price, pool_size, prizes (array)</div>
          <div><strong>Spin Wheel:</strong> min_bet, max_bet, segments (array with multipliers)</div>
          <div><strong>Staking:</strong> min_stake, apy, lock_period_days</div>
          <div><strong>Insurance:</strong> monthly_fee, coverage_ratio, max_claims_per_month</div>
          <div className="mt-2 pt-2 border-t">
            <strong>⚠️ Important:</strong> All monetary values are in BSK. Changes are instant and affect all users.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

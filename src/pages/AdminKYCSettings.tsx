import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function AdminKYCSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    min_age_years: 18,
    max_file_size_mb: 10,
    liveness_required: true,
    manual_review_required: true,
    selfie_match_threshold: 0.70,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_admin_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const schemas = data.level_schemas as any;
        setConfig({
          min_age_years: schemas?.L0?.minAgeYears || 18,
          max_file_size_mb: schemas?.maxFileSizeMB || 10,
          liveness_required: data.liveness_required,
          manual_review_required: data.manual_review_required,
          selfie_match_threshold: data.selfie_match_threshold,
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast({
        title: 'Error',
        description: 'Failed to load KYC settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Get existing config first
      const { data: existing } = await supabase
        .from('kyc_admin_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      const schemas = (existing?.level_schemas || {}) as any;
      const updatedSchema = {
        ...schemas,
        L0: {
          ...(schemas?.L0 || {}),
          minAgeYears: config.min_age_years,
        },
        maxFileSizeMB: config.max_file_size_mb,
      };

      const updateData = {
        level_schemas: updatedSchema,
        liveness_required: config.liveness_required,
        manual_review_required: config.manual_review_required,
        selfie_match_threshold: config.selfie_match_threshold,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        const result = await supabase
          .from('kyc_admin_config')
          .update(updateData)
          .eq('id', existing.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('kyc_admin_config')
          .insert(updateData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'KYC settings updated successfully',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save KYC settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">KYC Settings</span>
          </button>
          <Button onClick={handleSave} disabled={saving || loading} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 pt-6 px-4">
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h2 className="text-lg font-semibold mb-4">Age & Identity</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="min_age">Minimum Age (years)</Label>
              <Input
                id="min_age"
                type="number"
                value={config.min_age_years}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, min_age_years: parseInt(e.target.value) || 18 }))
                }
                disabled={loading}
                min={13}
                max={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Users must be at least this age to complete KYC
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="liveness">Liveness Check</Label>
                <p className="text-xs text-muted-foreground">
                  Require live selfie verification
                </p>
              </div>
              <Switch
                id="liveness"
                checked={config.liveness_required}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, liveness_required: checked }))
                }
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="threshold">Selfie Match Threshold</Label>
              <Input
                id="threshold"
                type="number"
                step="0.01"
                value={config.selfie_match_threshold}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    selfie_match_threshold: parseFloat(e.target.value) || 0.7,
                  }))
                }
                disabled={loading}
                min={0.5}
                max={1.0}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Confidence score for selfie-ID matching (0.5-1.0)
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h2 className="text-lg font-semibold mb-4">Document Upload</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="max_file_size">Max File Size (MB)</Label>
              <Input
                id="max_file_size"
                type="number"
                value={config.max_file_size_mb}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, max_file_size_mb: parseInt(e.target.value) || 10 }))
                }
                disabled={loading}
                min={1}
                max={50}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum size per document (1-50 MB)
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h2 className="text-lg font-semibold mb-4">Review Process</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="manual_review">Manual Review Required</Label>
                <p className="text-xs text-muted-foreground">
                  All submissions need admin approval
                </p>
              </div>
              <Switch
                id="manual_review"
                checked={config.manual_review_required}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, manual_review_required: checked }))
                }
                disabled={loading}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

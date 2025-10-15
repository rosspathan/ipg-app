import { ProgramModule } from "@/hooks/useProgramRegistry";
import { useProgramAssets } from "@/hooks/useProgramAssets";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Upload, X, AlertCircle } from "lucide-react";
import { useRef, useState } from "react";
import { programOverviewSchema } from "@/lib/validations/programSchema";
import { z } from "zod";

interface OverviewTabProps {
  module?: ProgramModule;
  onChange: (updates: Partial<ProgramModule>) => void;
}

export function OverviewTab({ module, onChange }: OverviewTabProps) {
  const { uploadAsset, uploading } = useProgramAssets(module?.id);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!module) {
    return <div className="text-muted-foreground">No module data available</div>;
  }

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const asset = await uploadAsset(file, 'icon');
    if (asset) {
      onChange({ icon: asset.url });
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const asset = await uploadAsset(file, 'banner');
    if (asset) {
      // Store banner in description for now (add banner field to DB later)
      onChange({ description: asset.url });
    }
  };

  const validateField = (field: string, value: any) => {
    try {
      const schema = programOverviewSchema.pick({ [field]: true } as any);
      schema.parse({ [field]: value });
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
      }
      return false;
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    onChange({ [field]: value });
    setTimeout(() => validateField(field, value), 300);
  };

  const toggleRegion = (region: string) => {
    const current = module.enabled_regions || [];
    const updated = current.includes(region)
      ? current.filter(r => r !== region)
      : [...current, region];
    handleFieldChange('enabled_regions', updated);
  };

  const toggleRole = (role: string) => {
    const current = module.enabled_roles || [];
    const updated = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    handleFieldChange('enabled_roles', updated);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm text-muted-foreground mb-2">
            Program Name *
          </Label>
          <Input
            value={module.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Enter program name"
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <div className="flex items-center gap-2 text-sm text-destructive mt-1">
              <AlertCircle className="h-4 w-4" />
              {errors.name}
            </div>
          )}
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2">
            Program Key *
          </Label>
          <Input
            value={module.key}
            onChange={(e) => handleFieldChange('key', e.target.value)}
            placeholder="program-key-slug"
            className={`font-mono ${errors.key ? "border-destructive" : ""}`}
          />
          {errors.key ? (
            <div className="flex items-center gap-2 text-sm text-destructive mt-1">
              <AlertCircle className="h-4 w-4" />
              {errors.key}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Unique identifier for this program
            </p>
          )}
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2">
            Description
          </Label>
          <Textarea
            value={module.description || ""}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe what this program does..."
            className={`min-h-[100px] ${errors.description ? "border-destructive" : ""}`}
          />
          {errors.description && (
            <div className="flex items-center gap-2 text-sm text-destructive mt-1">
              <AlertCircle className="h-4 w-4" />
              {errors.description}
            </div>
          )}
        </div>
      </div>

      {/* Visual Assets */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold mb-4">
          Visual Assets
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Icon Upload */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Program Icon
            </Label>
            {module.icon ? (
              <div className="relative border rounded-lg p-4">
                <img src={module.icon} alt="Icon" className="w-full h-32 object-contain" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => onChange({ icon: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div 
                  className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => iconInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    1:1 ratio
                  </p>
                </div>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconUpload}
                  disabled={uploading}
                />
              </>
            )}
          </div>

          {/* Banner Upload */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Banner Image
            </Label>
            {false ? (
              <div className="relative border rounded-lg p-4">
                <img src="" alt="Banner" className="w-full h-32 object-cover" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div 
                  className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    16:9 ratio
                  </p>
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                  disabled={uploading}
                />
              </>
            )}
          </div>
        </div>
      </CleanCard>

      {/* Region & Role Settings */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold mb-4">
          Availability
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Enabled Regions
            </Label>
            <div className="flex flex-wrap gap-2">
              {['India', 'USA', 'UK', 'Global'].map((region) => {
                const isEnabled = (module.enabled_regions || []).includes(region);
                return (
                  <button
                    key={region}
                    onClick={() => toggleRegion(region)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isEnabled
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
            {errors.enabled_regions && (
              <div className="flex items-center gap-2 text-sm text-destructive mt-2">
                <AlertCircle className="h-4 w-4" />
                {errors.enabled_regions}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Enabled Roles
            </Label>
            <div className="flex flex-wrap gap-2">
              {['User', 'VIP', 'Premium'].map((role) => {
                const isEnabled = (module.enabled_roles || []).includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isEnabled
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
            {errors.enabled_roles && (
              <div className="flex items-center gap-2 text-sm text-destructive mt-2">
                <AlertCircle className="h-4 w-4" />
                {errors.enabled_roles}
              </div>
            )}
          </div>
        </div>
      </CleanCard>
    </div>
  );
}

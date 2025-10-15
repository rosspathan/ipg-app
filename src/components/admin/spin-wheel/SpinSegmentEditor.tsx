import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Palette } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface Segment {
  id: string;
  label: string;
  multiplier: number;
  weight: number;
  color: string;
}

export function SpinSegmentEditor() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([
    { id: "1", label: "0x", multiplier: 0, weight: 30, color: "#ef4444" },
    { id: "2", label: "1.2x", multiplier: 1.2, weight: 25, color: "#3b82f6" },
    { id: "3", label: "1.5x", multiplier: 1.5, weight: 20, color: "#10b981" },
    { id: "4", label: "2x", multiplier: 2, weight: 15, color: "#f59e0b" },
    { id: "5", label: "5x", multiplier: 5, weight: 8, color: "#8b5cf6" },
    { id: "6", label: "10x", multiplier: 10, weight: 2, color: "#ec4899" }
  ]);

  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);

  const updateSegment = (id: string, field: keyof Segment, value: any) => {
    setSegments(
      segments.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const addSegment = () => {
    const newId = String(Date.now());
    setSegments([
      ...segments,
      {
        id: newId,
        label: "New",
        multiplier: 1,
        weight: 10,
        color: "#6b7280"
      }
    ]);
  };

  const removeSegment = (id: string) => {
    if (segments.length <= 3) {
      toast({
        title: "Cannot remove",
        description: "Wheel must have at least 3 segments",
        variant: "destructive"
      });
      return;
    }
    setSegments(segments.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Wheel Segments</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Total weight: {totalWeight} (should be 100 for balanced wheel)
              </p>
            </div>
            <Button size={isMobile ? "sm" : "default"} onClick={addSegment}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="p-4 border border-border rounded-lg space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Label */}
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={segment.label}
                    onChange={(e) =>
                      updateSegment(segment.id, "label", e.target.value)
                    }
                    className="h-9 text-sm"
                  />
                </div>

                {/* Multiplier */}
                <div>
                  <Label className="text-xs">Multiplier</Label>
                  <Input
                    type="number"
                    value={segment.multiplier}
                    onChange={(e) =>
                      updateSegment(
                        segment.id,
                        "multiplier",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    step="0.1"
                    className="h-9 text-sm"
                  />
                </div>

                {/* Weight */}
                <div>
                  <Label className="text-xs">Weight</Label>
                  <Input
                    type="number"
                    value={segment.weight}
                    onChange={(e) =>
                      updateSegment(
                        segment.id,
                        "weight",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="h-9 text-sm"
                  />
                </div>

                {/* Probability */}
                <div>
                  <Label className="text-xs">Probability</Label>
                  <div className="h-9 flex items-center">
                    <span className="text-sm font-semibold">
                      {totalWeight > 0
                        ? ((segment.weight / totalWeight) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                {/* Color & Actions */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Color</Label>
                    <div className="relative">
                      <Input
                        type="color"
                        value={segment.color}
                        onChange={(e) =>
                          updateSegment(segment.id, "color", e.target.value)
                        }
                        className="h-9 w-full cursor-pointer"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSegment(segment.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Save Button */}
          <Button className="w-full">Save Segment Configuration</Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ModernLevelSelectorProps {
  levels: Array<{ level: number; count: number }>;
  selectedLevel: number;
  onLevelChange: (level: number) => void;
}

export function ModernLevelSelector({ 
  levels, 
  selectedLevel, 
  onLevelChange 
}: ModernLevelSelectorProps) {
  return (
    <div className="w-full">
      <RadioGroup
        value={selectedLevel.toString()}
        onValueChange={(value) => onLevelChange(Number(value))}
        className="flex flex-wrap gap-3"
      >
        {levels.map(({ level, count }) => (
          <div key={level} className="relative">
            <RadioGroupItem
              value={level.toString()}
              id={`level-${level}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`level-${level}`}
              className="flex items-center gap-3 px-5 py-3 rounded-lg border-2 border-border bg-background cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Level {level}</span>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {count}
                </Badge>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

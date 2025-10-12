import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface DOBPickerProps {
  value?: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  minAgeYears?: number;
  error?: string;
}

export function DOBPicker({ value, onChange, disabled, minAgeYears = 18, error }: DOBPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(value) : undefined;
  
  // Calculate max date (must be at least minAgeYears old)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - minAgeYears);
  
  // Calculate min date (reasonable age limit - 120 years)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Date of Birth
        <span className="text-danger">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !value && "text-muted-foreground",
              error && "border-danger focus-visible:ring-danger"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) =>
              date > maxDate || date < minDate
            }
            initialFocus
            captionLayout="dropdown"
            fromYear={minDate.getFullYear()}
            toYear={maxDate.getFullYear()}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-xs text-danger animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}

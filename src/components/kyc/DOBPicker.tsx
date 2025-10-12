import { useState, useEffect } from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DOBPickerProps {
  value?: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  minAgeYears?: number;
  error?: string;
}

export function DOBPicker({ value, onChange, disabled, minAgeYears = 18, error }: DOBPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [age, setAge] = useState<number | null>(null);

  // Calculate max date (minAgeYears ago from today)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - minAgeYears);

  // Calculate age
  useEffect(() => {
    if (selectedDate) {
      const today = new Date();
      let calculatedAge = today.getFullYear() - selectedDate.getFullYear();
      const monthDiff = today.getMonth() - selectedDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  }, [selectedDate]);

  const handleQuickSelect = (yearsAgo: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - yearsAgo);
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      // Check if age meets minimum requirement
      if (age !== null && age < minAgeYears) {
        return; // Don't allow selection below minimum age
      }
      const formatted = selectedDate.toISOString().split('T')[0];
      onChange(formatted);
      setOpen(false);
    }
  };

  const displayValue = selectedDate 
    ? selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Pick a date';

  const isValidAge = age === null || age >= minAgeYears;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "w-full justify-start text-left font-normal",
          !value && "text-muted-foreground",
          error && "border-danger focus-visible:ring-danger"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {displayValue}
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle>Select Date of Birth</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
            </DrawerClose>
          </DrawerHeader>

          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Quick Select Chips */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Quick Select Age</p>
              <div className="grid grid-cols-4 gap-2">
                {[18, 21, 25, 30].map((years) => (
                  <Button
                    key={years}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect(years)}
                    className="w-full"
                  >
                    {years}y
                  </Button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) =>
                  date > maxDate || date < new Date("1900-01-01")
                }
                initialFocus
                className="pointer-events-auto rounded-lg border"
                defaultMonth={selectedDate || maxDate}
              />
            </div>

            {/* Age Display */}
            {age !== null && (
              <div className={cn(
                "p-3 rounded-lg text-center",
                isValidAge ? "bg-success/10 border border-success/20" : "bg-danger/10 border border-danger/20"
              )}>
                <p className={cn(
                  "text-sm font-medium",
                  isValidAge ? "text-success" : "text-danger"
                )}>
                  Age: {age} years
                </p>
                {!isValidAge && (
                  <p className="text-xs text-danger mt-1">
                    Must be at least {minAgeYears} years old
                  </p>
                )}
              </div>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              disabled={!selectedDate || !isValidAge}
              className="w-full"
            >
              Confirm Date
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

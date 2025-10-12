import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface ModernDOBPickerProps {
  value?: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  minAgeYears?: number;
  error?: string;
}

/**
 * Modern DOB picker with mobile-optimized wheel selectors
 * Shows live age calculation
 */
export function ModernDOBPicker({ 
  value, 
  onChange, 
  disabled, 
  minAgeYears = 18, 
  error 
}: ModernDOBPickerProps) {
  const [open, setOpen] = useState(false);
  
  // Parse existing value or default to min age date
  const existingDate = value ? new Date(value) : null;
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - minAgeYears, today.getMonth(), today.getDate());
  
  const [day, setDay] = useState(existingDate?.getDate() || maxDate.getDate());
  const [month, setMonth] = useState(existingDate?.getMonth() || maxDate.getMonth());
  const [year, setYear] = useState(existingDate?.getFullYear() || maxDate.getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate age
  const calculateAge = (y: number, m: number, d: number) => {
    const birthDate = new Date(y, m, d);
    const diff = today.getTime() - birthDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const currentAge = calculateAge(year, month, day);

  // Get days in month
  const getDaysInMonth = (m: number, y: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => today.getFullYear() - minAgeYears - i);

  const handleConfirm = () => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setOpen(false);
  };

  const formatDate = () => {
    if (!value) return 'Pick a date';
    const date = new Date(value);
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Date of Birth
        <span className="text-danger">*</span>
      </Label>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            data-testid="kyc-dob-open"
            className={cn(
              "w-full justify-start text-left font-normal h-12",
              !value && "text-muted-foreground",
              error && "border-danger focus-visible:ring-danger"
            )}
          >
            <CalendarIcon className="mr-2 h-5 w-5" />
            <div className="flex-1">
              <div className="text-sm">{formatDate()}</div>
              {value && (
                <div className="text-xs text-muted-foreground" data-testid="kyc-dob-age">
                  Age: {currentAge} years
                </div>
              )}
            </div>
          </Button>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="h-[400px]">
          <SheetHeader>
            <SheetTitle>Select Date of Birth</SheetTitle>
          </SheetHeader>
          
          <div className="py-4">
            <div className="flex items-center justify-center gap-2 h-48 overflow-hidden">
              {/* Day Picker */}
              <div className="flex-1 relative h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
                <div className="py-20">
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDay(d)}
                      className={cn(
                        "w-full h-12 flex items-center justify-center text-lg transition-all snap-center",
                        day === d 
                          ? "text-foreground font-bold scale-110" 
                          : "text-muted-foreground scale-90"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month Picker */}
              <div className="flex-2 relative h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
                <div className="py-20">
                  {months.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => setMonth(idx)}
                      className={cn(
                        "w-full h-12 flex items-center justify-center text-lg transition-all snap-center",
                        month === idx 
                          ? "text-foreground font-bold scale-110" 
                          : "text-muted-foreground scale-90"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Picker */}
              <div className="flex-1 relative h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
                <div className="py-20">
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className={cn(
                        "w-full h-12 flex items-center justify-center text-lg transition-all snap-center",
                        year === y 
                          ? "text-foreground font-bold scale-110" 
                          : "text-muted-foreground scale-90"
                      )}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Age Display */}
            <div className="text-center mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="text-2xl font-bold text-foreground" data-testid="kyc-dob">
                {currentAge} years
              </p>
              {currentAge < minAgeYears && (
                <p className="text-xs text-danger mt-1">
                  Minimum age required: {minAgeYears} years
                </p>
              )}
            </div>

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              disabled={currentAge < minAgeYears}
              className="w-full mt-4 h-12"
            >
              Confirm Date
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {error && (
        <p className="text-xs text-danger animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
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
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - minAgeYears);
    return value ? new Date(value) : maxDate;
  });

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
    setCurrentMonth(date);
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

  // Calendar generation
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push(prevDate);
    }
    
    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push(new Date(year, month + 1, i));
      }
    }
    
    return days;
  };

  const monthDays = getDaysInMonth(currentMonth);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      // Don't go beyond max date
      if (newDate <= maxDate) {
        return newDate;
      }
      return prev;
    });
  };

  const isDateSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isDateDisabled = (date: Date | null) => {
    if (!date) return true;
    return date > maxDate || date < new Date("1900-01-01");
  };

  const isCurrentMonthDate = (date: Date | null) => {
    if (!date) return false;
    return date.getMonth() === currentMonth.getMonth();
  };

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
        <DrawerContent className="max-h-[90vh] bg-background">
          <DrawerHeader className="border-b border-border/40 relative">
            <DrawerTitle className="text-center">Select Date of Birth</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted">
              <X className="h-5 w-5" />
            </DrawerClose>
          </DrawerHeader>

          <div className="p-4 space-y-5 overflow-y-auto">
            {/* Quick Select Age Chips */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Quick Select Age</p>
              <div className="grid grid-cols-4 gap-2">
                {[18, 21, 25, 30].map((years) => (
                  <Button
                    key={years}
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => handleQuickSelect(years)}
                    className="h-11 text-base font-medium rounded-xl"
                  >
                    {years}y
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Calendar */}
            <div className="space-y-3">
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <p className="text-base font-semibold">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  disabled={currentMonth >= maxDate}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-2">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-xs font-medium text-muted-foreground h-8 flex items-center justify-center">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Date Cells */}
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((date, index) => {
                    const isSelected = isDateSelected(date);
                    const isDisabled = isDateDisabled(date);
                    const isCurrentMonth = isCurrentMonthDate(date);

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => !isDisabled && date && setSelectedDate(date)}
                        disabled={isDisabled}
                        className={cn(
                          "h-11 rounded-lg text-sm font-medium transition-all",
                          "flex items-center justify-center",
                          isSelected && "bg-primary text-primary-foreground",
                          !isSelected && !isDisabled && isCurrentMonth && "hover:bg-muted",
                          !isSelected && !isDisabled && !isCurrentMonth && "text-muted-foreground opacity-40",
                          isDisabled && "opacity-30 cursor-not-allowed"
                        )}
                      >
                        {date?.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Age Display */}
            {age !== null && (
              <div className={cn(
                "p-3 rounded-xl text-center font-medium",
                isValidAge ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"
              )}>
                <p className="text-sm">
                  Age: {age} years
                </p>
                {!isValidAge && (
                  <p className="text-xs mt-1 opacity-90">
                    Must be at least {minAgeYears} years old
                  </p>
                )}
              </div>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              disabled={!selectedDate || !isValidAge}
              className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90"
            >
              Confirm Date
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

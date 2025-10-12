import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export function ValidatedInput({ label, error, required, className, ...props }: ValidatedInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id} className="flex items-center gap-1">
        {label}
        {required && <span className="text-danger">*</span>}
      </Label>
      <Input
        {...props}
        className={cn(
          error && "border-danger focus-visible:ring-danger",
          className
        )}
      />
      {error && (
        <p className="text-xs text-danger animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}

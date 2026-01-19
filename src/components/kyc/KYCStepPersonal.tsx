import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User, Calendar, Phone, MapPin, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { usePhoneValidation } from "@/hooks/usePhoneValidation";

const personalSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD").refine((date) => {
    const age = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18;
  }, "Must be 18 or older"),
  nationality: z.string().min(2, "Please select your nationality"),
  phone: z.string().regex(
    /^\+\d{1,3}\s?\d{6,14}$/,
    "Use format: +CountryCode PhoneNumber (e.g., +91 9876543210 or +1 5551234567)"
  ),
});

type PersonalData = z.infer<typeof personalSchema>;

interface KYCStepPersonalProps {
  initialData: Partial<PersonalData>;
  onNext: (data: PersonalData) => void;
}

export const KYCStepPersonal = ({ initialData, onNext }: KYCStepPersonalProps) => {
  const form = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
    defaultValues: initialData,
  });

  const { isChecking, validationResult, validatePhone, resetValidation } = usePhoneValidation();
  
  const phoneValue = form.watch("phone");
  
  // Validate phone on change
  useEffect(() => {
    if (phoneValue && phoneValue.length >= 8) {
      validatePhone(phoneValue);
    } else {
      resetValidation();
    }
  }, [phoneValue, validatePhone, resetValidation]);

  const isPhoneInvalid = validationResult && !validationResult.available;
  const isPhoneValid = validationResult && validationResult.available && !isChecking;

  const handleSubmit = (data: PersonalData) => {
    // Block submission if phone is taken
    if (isPhoneInvalid) {
      form.setError("phone", {
        type: "manual",
        message: validationResult.error || "This mobile number is already used for KYC."
      });
      return;
    }
    onNext(data);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Personal Information</h2>
        <p className="text-muted-foreground">Let's start with your basic details</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Legal Name
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="As it appears on your ID" 
                    className="h-12 text-base"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date of Birth
                </FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    className="h-12 text-base"
                    max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nationality"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Nationality
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Select your nationality" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type="tel" 
                      placeholder="+91 9876543210" 
                      className={`h-12 text-base pr-10 ${
                        isPhoneInvalid ? 'border-destructive focus-visible:ring-destructive' : 
                        isPhoneValid ? 'border-emerald-500 focus-visible:ring-emerald-500' : ''
                      }`}
                      {...field} 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isChecking && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {isPhoneValid && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      {isPhoneInvalid && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Format: +CountryCode PhoneNumber (e.g., +91 9876543210, +1 5551234567)
                </p>
                {isPhoneInvalid && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {validationResult.error || "This mobile number is already used for KYC. Please contact support."}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-12 text-base"
            disabled={isChecking || isPhoneInvalid}
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Continue to Address'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

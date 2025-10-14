import { z } from 'zod';

export const kycSubmissionSchema = z.object({
  full_name: z.string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Full name can only contain letters, spaces, hyphens, and apostrophes"),
  
  date_of_birth: z.string()
    .refine(dob => {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 18;
      }
      return age >= 18;
    }, "You must be at least 18 years old"),
  
  nationality: z.string().min(2, "Nationality is required"),
  
  phone: z.string()
    .regex(/^\+\d{1,3}\s?\d{6,14}$/, "Invalid phone format. Use format: +CountryCode PhoneNumber (e.g., +91 9876543210)"),
  
  address_line1: z.string().min(5, "Address must be at least 5 characters"),
  address_line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().optional(),
  postal_code: z.string().min(4, "Valid postal code required").max(10),
  country: z.string().min(2, "Country is required"),
  
  id_type: z.enum(['aadhaar', 'passport', 'drivers_license', 'national_id'], {
    errorMap: () => ({ message: "Please select a valid ID type" })
  }),
  id_number: z.string().min(5, "ID number is required"),
  id_front_url: z.string().url("ID front photo is required"),
  id_back_url: z.string().url("ID back photo is required"),
  selfie_url: z.string().url("Selfie photo is required"),
});

export type KYCSubmissionData = z.infer<typeof kycSubmissionSchema>;

export const validateKYCSubmission = (data: Partial<KYCSubmissionData>) => {
  try {
    kycSubmissionSchema.parse(data);
    return { success: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: "Validation failed" } };
  }
};

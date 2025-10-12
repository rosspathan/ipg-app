export interface ValidationError {
  field: string;
  message: string;
}

export interface KYCValidationRules {
  minAgeYears: number;
  maxFileSizeMB: number;
  allowedFileTypes: string[];
  phonePattern: RegExp;
  postalCodePatterns: Record<string, RegExp>;
}

export const DEFAULT_VALIDATION_RULES: KYCValidationRules = {
  minAgeYears: 18,
  maxFileSizeMB: 10,
  allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
  phonePattern: /^\+?[1-9]\d{1,14}$/, // E.164 format
  postalCodePatterns: {
    IN: /^\d{6}$/,
    US: /^\d{5}(-\d{4})?$/,
    GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
  }
};

export function validatePhone(phone: string, rules = DEFAULT_VALIDATION_RULES): string | null {
  if (!phone || !phone.trim()) {
    return 'Phone number is required';
  }
  
  // Remove spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, '');
  
  if (!rules.phonePattern.test(cleaned)) {
    return 'Invalid phone number format (use E.164 format, e.g., +1234567890)';
  }
  
  return null;
}

export function validatePostalCode(postalCode: string, country: string, rules = DEFAULT_VALIDATION_RULES): string | null {
  if (!postalCode || !postalCode.trim()) {
    return 'Postal code is required';
  }
  
  const pattern = rules.postalCodePatterns[country];
  if (pattern && !pattern.test(postalCode.trim())) {
    return `Invalid postal code format for ${country}`;
  }
  
  return null;
}

export function validateDOB(dob: string, minAgeYears: number): string | null {
  if (!dob) {
    return 'Date of birth is required';
  }
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  if (birthDate > today) {
    return 'Date of birth cannot be in the future';
  }
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < minAgeYears) {
    return `Must be at least ${minAgeYears} years old`;
  }
  
  return null;
}

export function validateFile(file: File, rules = DEFAULT_VALIDATION_RULES): string | null {
  if (!file) {
    return 'File is required';
  }
  
  // Check file type
  if (!rules.allowedFileTypes.includes(file.type)) {
    return `File type not allowed. Accepted: ${rules.allowedFileTypes.join(', ')}`;
  }
  
  // Check file size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > rules.maxFileSizeMB) {
    return `File size exceeds ${rules.maxFileSizeMB}MB limit`;
  }
  
  return null;
}

export function validateRequired(value: any, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateKYCLevel(
  level: 'L0' | 'L1' | 'L2',
  formData: Record<string, any>,
  rules = DEFAULT_VALIDATION_RULES
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (level === 'L0') {
    // Basic Info Validation
    const requiredFields = [
      { key: 'legal_name', label: 'Legal Name' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'country', label: 'Country' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'city', label: 'City' },
      { key: 'postal_code', label: 'Postal Code' },
    ];
    
    requiredFields.forEach(({ key, label }) => {
      const error = validateRequired(formData[key], label);
      if (error) errors.push({ field: key, message: error });
    });
    
    // DOB validation
    if (formData.dob) {
      const dobError = validateDOB(formData.dob, rules.minAgeYears);
      if (dobError) errors.push({ field: 'dob', message: dobError });
    }
    
    // Phone validation
    if (formData.phone) {
      const phoneError = validatePhone(formData.phone, rules);
      if (phoneError) errors.push({ field: 'phone', message: phoneError });
    }
    
    // Postal code validation - use country of residence when available, fallback to nationality
    const countryForPostal = formData.country || formData.nationality;
    if (formData.postal_code && countryForPostal) {
      const postalError = validatePostalCode(formData.postal_code, countryForPostal, rules);
      if (postalError) errors.push({ field: 'postal_code', message: postalError });
    }
  } else if (level === 'L1') {
    // Identity Validation
    const requiredFields = [
      { key: 'id_type', label: 'ID Type' },
      { key: 'id_number', label: 'ID Number' },
      { key: 'id_front', label: 'ID Front' },
      { key: 'id_back', label: 'ID Back' },
      { key: 'selfie', label: 'Selfie' },
    ];
    
    requiredFields.forEach(({ key, label }) => {
      const error = validateRequired(formData[key], label);
      if (error) errors.push({ field: key, message: error });
    });
  } else if (level === 'L2') {
    // Enhanced Validation
    const requiredFields = [
      { key: 'source_of_funds', label: 'Source of Funds' },
      { key: 'occupation', label: 'Occupation' },
    ];
    
    requiredFields.forEach(({ key, label }) => {
      const error = validateRequired(formData[key], label);
      if (error) errors.push({ field: key, message: error });
    });
  }
  
  return errors;
}

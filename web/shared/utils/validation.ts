/**
 * Password strength validation utility
 */
export const getPasswordStrength = (password: string): "weak" | "medium" | "strong" | "veryStrong" => {
  if (password.length < 8) return "weak";
  
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  if (score <= 5) return "strong";
  return "veryStrong";
};

/**
 * Password requirements checker
 */
export const checkPasswordRequirements = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
  };
};

/**
 * Form validation state utility
 */
export type ValidationState = "idle" | "checking" | "valid" | "invalid";

/**
 * Enhanced subdomain validation
 */
export const validateSubdomain = (subdomain: string): { isValid: boolean; error?: string } => {
  if (!subdomain) {
    return { isValid: false, error: "Subdomain is required" };
  }
  
  if (subdomain.length < 3) {
    return { isValid: false, error: "Subdomain must be at least 3 characters" };
  }
  
  if (subdomain.length > 30) {
    return { isValid: false, error: "Subdomain must be no more than 30 characters" };
  }
  
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return { isValid: false, error: "Subdomain can only contain lowercase letters, numbers, and hyphens" };
  }
  
  if (subdomain.startsWith("-") || subdomain.endsWith("-")) {
    return { isValid: false, error: "Subdomain cannot start or end with a hyphen" };
  }
  
  if (subdomain.includes("--")) {
    return { isValid: false, error: "Subdomain cannot contain consecutive hyphens" };
  }
  
  // Reserved subdomains
  const reserved = ["www", "api", "admin", "app", "mail", "ftp", "blog", "shop", "store"];
  if (reserved.includes(subdomain.toLowerCase())) {
    return { isValid: false, error: "This subdomain is reserved" };
  }
  
  return { isValid: true };
};

/**
 * Enhanced email validation
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  return { isValid: true };
};

/**
 * Form error handling utility
 */
export const getFormErrorMessage = (errors: Record<string, { message?: string }>, field: string): string | undefined => {
  const error = errors[field];
  if (!error) return undefined;
  
  if (typeof error.message === "string") {
    return error.message;
  }
  
  return "Invalid input";
};

/**
 * Success state utility for forms
 */
export const createSuccessState = (message: string, duration = 5000) => {
  return {
    type: "success" as const,
    message,
    duration,
    timestamp: Date.now(),
  };
};

/**
 * Error state utility for forms
 */
export const createErrorState = (message: string, field?: string) => {
  return {
    type: "error" as const,
    message,
    field,
    timestamp: Date.now(),
  };
};
/**
 * Enhanced signup validation integration
 * This module provides all validation utilities needed for the signup form
 */

import { SignupFormData } from "@/shared/schemas/signup";
import { validatePasswordStrength, PasswordValidationResult } from "@/shared/utils/passwordValidation";
import { validateSubdomain, validateEmail } from "@/shared/utils/validation";

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface SignupValidationState {
  name: FieldValidationResult;
  subdomain: FieldValidationResult;
  email: FieldValidationResult;
  password: FieldValidationResult & { strength?: PasswordValidationResult };
  confirmPassword: FieldValidationResult;
  policyAgreement: FieldValidationResult;
  form: FieldValidationResult;
}

/**
 * Validates all signup form fields and returns comprehensive validation state
 */
export function validateSignupForm(data: Partial<SignupFormData>): SignupValidationState {
  const validation: SignupValidationState = {
    name: validateName(data.name),
    subdomain: validateSubdomainField(data.subdomain),
    email: validateEmailField(data.email),
    password: validatePasswordField(data.password),
    confirmPassword: validateConfirmPasswordField(data.confirmPassword, data.password),
    policyAgreement: validatePolicyAgreementField(data.policyAgreement),
    form: { isValid: true },
  };

  // Check overall form validity
  const isFormValid = Object.entries(validation)
    .filter(([key]) => key !== "form")
    .every(([, field]) => field.isValid);

  validation.form = {
    isValid: isFormValid,
    error: isFormValid ? undefined : "Please fix the errors above",
  };

  return validation;
}

/**
 * Validates restaurant name field
 */
export function validateName(name?: string): FieldValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "Restaurant name is required" };
  }

  if (name.length > 100) {
    return { isValid: false, error: "Restaurant name must be less than 100 characters" };
  }

  return { isValid: true };
}

/**
 * Validates subdomain field
 */
export function validateSubdomainField(subdomain?: string): FieldValidationResult {
  if (!subdomain) {
    return { isValid: false, error: "Subdomain is required" };
  }

  const subdomainValidation = validateSubdomain(subdomain);
  
  return {
    isValid: subdomainValidation.isValid,
    error: subdomainValidation.error,
  };
}

/**
 * Validates email field
 */
export function validateEmailField(email?: string): FieldValidationResult {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }

  const emailValidation = validateEmail(email);
  
  return {
    isValid: emailValidation.isValid,
    error: emailValidation.error,
  };
}

/**
 * Validates password field with strength checking
 */
export function validatePasswordField(password?: string): FieldValidationResult & { strength?: PasswordValidationResult } {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters" };
  }

  const strength = validatePasswordStrength(password);
  
  return {
    isValid: strength.isValid,
    error: strength.isValid ? undefined : "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    strength,
  };
}

/**
 * Validates password confirmation field
 */
export function validateConfirmPasswordField(
  confirmPassword?: string,
  password?: string
): FieldValidationResult {
  if (!confirmPassword) {
    return { isValid: false, error: "Please confirm your password" };
  }

  if (password && confirmPassword !== password) {
    return { isValid: false, error: "Passwords do not match" };
  }

  return { isValid: true };
}

/**
 * Validates policy agreement field
 */
export function validatePolicyAgreementField(policyAgreement?: boolean): FieldValidationResult {
  if (!policyAgreement) {
    return { 
      isValid: false, 
      error: "You must agree to the Terms of Service and Privacy Policy" 
    };
  }

  return { isValid: true };
}

/**
 * Gets validation error message for display in forms
 */
export function getValidationErrorMessage(
  validation: FieldValidationResult
): string | undefined {
  if (!validation.isValid && validation.error) {
    return validation.error;
  }
  return undefined;
}

/**
 * Checks if any field has validation errors
 */
export function hasValidationErrors(validation: SignupValidationState): boolean {
  return !validation.form.isValid;
}

/**
 * Gets all validation error messages as an array
 */
export function getAllValidationErrors(validation: SignupValidationState): string[] {
  const errors: string[] = [];
  
  Object.entries(validation).forEach(([key, field]) => {
    if (key !== "form" && !field.isValid && field.error) {
      errors.push(field.error);
    }
  });
  
  return errors;
}

/**
 * Real-time field validation for use in form inputs
 */
export function validateFieldRealTime(
  fieldName: keyof SignupFormData,
  value: unknown,
  allData?: Partial<SignupFormData>
): FieldValidationResult {
  switch (fieldName) {
    case "name":
      return validateName(String(value || ""));
    case "subdomain":
      return validateSubdomainField(String(value || ""));
    case "email":
      return validateEmailField(String(value || ""));
    case "password":
      return validatePasswordField(String(value || ""));
    case "confirmPassword":
      return validateConfirmPasswordField(String(value || ""), allData?.password);
    case "policyAgreement":
      return validatePolicyAgreementField(Boolean(value));
    default:
      return { isValid: true };
  }
}

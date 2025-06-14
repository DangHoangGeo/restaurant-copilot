import { useCallback, useState } from "react";
import { ZodError } from "zod";
import { signupSchema, SignupFormData } from "@/shared/schemas/signup";
import { validatePasswordStrength } from "@/shared/utils/passwordValidation";
import { parseZodErrors } from "@/shared/utils/formValidation";
import { validateSubdomain, validateEmail } from "@/shared/utils/validation";

export interface UseSignupValidationOptions {
  onFieldValidation?: (field: string, isValid: boolean) => void;
}

export function useSignupValidation(options: UseSignupValidationOptions = {}) {
  const { onFieldValidation } = options;
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validatedFields, setValidatedFields] = useState<Set<string>>(new Set());

  const validateField = useCallback((field: keyof SignupFormData, value: unknown, allData?: Partial<SignupFormData>) => {
    let error: string | undefined;

    switch (field) {
      case "name":
        const nameValue = String(value || "");
        if (!nameValue || nameValue.trim().length === 0) {
          error = "Restaurant name is required";
        } else if (nameValue.length > 100) {
          error = "Restaurant name must be less than 100 characters";
        }
        break;

      case "subdomain":
        const subdomainValue = String(value || "");
        const subdomainValidation = validateSubdomain(subdomainValue);
        if (!subdomainValidation.isValid) {
          error = subdomainValidation.error;
        }
        break;

      case "email":
        const emailValue = String(value || "");
        const emailValidation = validateEmail(emailValue);
        if (!emailValidation.isValid) {
          error = emailValidation.error;
        }
        break;

      case "password":
        const passwordValue = String(value || "");
        const passwordValidation = validatePasswordStrength(passwordValue);
        if (!passwordValidation.isValid) {
          error = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
        } else if (passwordValue.length < 8) {
          error = "Password must be at least 8 characters";
        }
        break;

      case "confirmPassword":
        const confirmPasswordValue = String(value || "");
        if (allData?.password && confirmPasswordValue && confirmPasswordValue !== allData.password) {
          error = "Passwords do not match";
        }
        break;

      case "policyAgreement":
        if (!value) {
          error = "You must agree to the Terms of Service and Privacy Policy";
        }
        break;
    }

    const isValid = !error;
    
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });

    setValidatedFields(prev => new Set(prev).add(field));
    onFieldValidation?.(field, isValid);

    return { isValid, error };
  }, [onFieldValidation]);

  const validateForm = useCallback((data: Partial<SignupFormData>) => {
    try {
      signupSchema.parse(data);
      setFieldErrors({});
      return { isValid: true, errors: {} };
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
        const validationResult = parseZodErrors(error as ZodError);
        setFieldErrors(validationResult.errorMap);
        return { isValid: false, errors: validationResult.errorMap };
      }
      return { isValid: false, errors: { root: "Validation failed" } };
    }
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setValidatedFields(new Set());
  }, []);

  const getFieldError = useCallback((field: string) => {
    return fieldErrors[field];
  }, [fieldErrors]);

  const hasFieldError = useCallback((field: string) => {
    return field in fieldErrors;
  }, [fieldErrors]);

  const isFieldValidated = useCallback((field: string) => {
    return validatedFields.has(field);
  }, [validatedFields]);

  return {
    fieldErrors,
    validateField,
    validateForm,
    clearFieldError,
    clearAllErrors,
    getFieldError,
    hasFieldError,
    isFieldValidated,
  };
}
import { ZodError } from "zod";

/**
 * Form error handling utilities
 */

export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
  errorMap: Record<string, string>;
}

/**
 * Converts Zod validation errors to a more usable format
 */
export function parseZodErrors(error: ZodError): FormValidationResult {
  const errors: FormFieldError[] = error.issues.map(issue => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  const errorMap: Record<string, string> = {};
  errors.forEach(error => {
    errorMap[error.field] = error.message;
  });

  return {
    isValid: false,
    errors,
    errorMap,
  };
}

/**
 * Formats server validation errors to match client-side format
 */
export function formatServerErrors(
  serverErrors: Record<string, string[]> | string
): FormValidationResult {
  if (typeof serverErrors === "string") {
    return {
      isValid: false,
      errors: [{ field: "root", message: serverErrors }],
      errorMap: { root: serverErrors },
    };
  }

  const errors: FormFieldError[] = [];
  const errorMap: Record<string, string> = {};

  Object.entries(serverErrors).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : messages;
    errors.push({ field, message });
    errorMap[field] = message;
  });

  return {
    isValid: false,
    errors,
    errorMap,
  };
}

/**
 * Combines multiple validation results
 */
export function combineValidationResults(
  ...results: FormValidationResult[]
): FormValidationResult {
  const allErrors: FormFieldError[] = [];
  const errorMap: Record<string, string> = {};

  results.forEach(result => {
    allErrors.push(...result.errors);
    Object.assign(errorMap, result.errorMap);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    errorMap,
  };
}

/**
 * Gets the first error message for a specific field
 */
export function getFieldError(
  validation: FormValidationResult,
  fieldName: string
): string | undefined {
  return validation.errorMap[fieldName];
}

/**
 * Checks if a specific field has an error
 */
export function hasFieldError(
  validation: FormValidationResult,
  fieldName: string
): boolean {
  return fieldName in validation.errorMap;
}

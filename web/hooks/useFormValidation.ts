import { useState, useCallback } from "react";

export type FormState = {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
};

export type UseFormValidationOptions = {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  resetOnSuccess?: boolean;
  resetTimeout?: number;
};

/**
 * Enhanced form validation hook with success/error state management
 */
export function useFormValidation(options: UseFormValidationOptions = {}) {
  const {
    onSuccess,
    onError,
    resetOnSuccess = true,
    resetTimeout = 5000,
  } = options;

  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    isSuccess: false,
    error: null,
    fieldErrors: {},
  });

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setFormState(prev => ({ ...prev, isSubmitting }));
  }, []);

  const setSuccess = useCallback(() => {
    setFormState({
      isSubmitting: false,
      isSuccess: true,
      error: null,
      fieldErrors: {},
    });

    onSuccess?.();

    if (resetOnSuccess) {
      setTimeout(() => {
        setFormState(prev => ({ ...prev, isSuccess: false }));
      }, resetTimeout);
    }
  }, [onSuccess, resetOnSuccess, resetTimeout]);

  const setError = useCallback((error: string | null, fieldErrors: Record<string, string> = {}) => {
    setFormState({
      isSubmitting: false,
      isSuccess: false,
      error,
      fieldErrors,
    });

    if (error) {
      onError?.(error);
    }
  }, [onError]);

  const clearErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      error: null,
      fieldErrors: {},
    }));
  }, []);

  const reset = useCallback(() => {
    setFormState({
      isSubmitting: false,
      isSuccess: false,
      error: null,
      fieldErrors: {},
    });
  }, []);

  return {
    formState,
    setSubmitting,
    setSuccess,
    setError,
    clearErrors,
    reset,
  };
}

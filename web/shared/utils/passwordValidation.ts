/**
 * Password strength validation utilities
 */

export type PasswordStrength = "weak" | "medium" | "strong" | "very-strong";

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
  regex?: RegExp;
  minLength?: number;
}

export interface PasswordValidationResult {
  strength: PasswordStrength;
  score: number;
  requirements: PasswordRequirement[];
  isValid: boolean;
}

/**
 * Validates password strength and requirements
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const requirements: PasswordRequirement[] = [
    {
      id: "minLength",
      label: "At least 8 characters long",
      met: password.length >= 8,
      minLength: 8,
    },
    {
      id: "uppercase",
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(password),
      regex: /[A-Z]/,
    },
    {
      id: "lowercase",
      label: "Contains lowercase letter",
      met: /[a-z]/.test(password),
      regex: /[a-z]/,
    },
    {
      id: "number",
      label: "Contains number",
      met: /\d/.test(password),
      regex: /\d/,
    },
  ];

  const metRequirements = requirements.filter(req => req.met).length;
  const score = metRequirements / requirements.length;
  
  let strength: PasswordStrength;
  if (score === 1) {
    strength = "very-strong";
  } else if (score >= 0.75) {
    strength = "strong";
  } else if (score >= 0.5) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  const isValid = metRequirements === requirements.length;

  return {
    strength,
    score,
    requirements,
    isValid,
  };
}

/**
 * Gets password strength color for UI display
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case "very-strong":
      return "text-green-600 dark:text-green-400";
    case "strong":
      return "text-green-500 dark:text-green-400";
    case "medium":
      return "text-yellow-500 dark:text-yellow-400";
    case "weak":
    default:
      return "text-red-500 dark:text-red-400";
  }
}

/**
 * Gets password strength progress bar color
 */
export function getPasswordStrengthProgressColor(strength: PasswordStrength): string {
  switch (strength) {
    case "very-strong":
      return "bg-green-600";
    case "strong":
      return "bg-green-500";
    case "medium":
      return "bg-yellow-500";
    case "weak":
    default:
      return "bg-red-500";
  }
}

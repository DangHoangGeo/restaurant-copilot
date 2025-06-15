"use client";

import React, { useState, useMemo } from "react";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  label?: string;
  showStrengthIndicator?: boolean;
  showRequirements?: boolean;
  confirmPassword?: string;
  onPasswordChange?: (password: string) => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

export function PasswordInput({
  label,
  showStrengthIndicator = true,
  showRequirements = true,
  confirmPassword,
  onPasswordChange,
  className,
  value = "",
  onChange,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations("auth");
  
  const password = String(value);

  const passwordStrength = useMemo((): PasswordStrength => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strengthLabels = ["veryWeak", "weak", "medium", "strong", "veryStrong"];
    const strengthColors = ["text-red-600", "text-orange-600", "text-yellow-600", "text-blue-600", "text-green-600"];
    const strengthBgColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

    return {
      score,
      label: strengthLabels[score - 1] || "veryWeak",
      color: strengthColors[score - 1] || "text-red-600",
      bgColor: strengthBgColors[score - 1] || "bg-red-500"
    };
  }, [password]);

  const requirements = useMemo(() => [
    { 
      key: "minLength", 
      test: password.length >= 8, 
      text: t("password.minLength") || "At least 8 characters long"
    },
    { 
      key: "uppercase", 
      test: /[A-Z]/.test(password), 
      text: t("password.uppercase") || "Contains uppercase letter"
    },
    { 
      key: "lowercase", 
      test: /[a-z]/.test(password), 
      text: t("password.lowercase") || "Contains lowercase letter"
    },
    { 
      key: "number", 
      test: /[0-9]/.test(password), 
      text: t("password.number") || "Contains number"
    },
    { 
      key: "special", 
      test: /[^A-Za-z0-9]/.test(password), 
      text: t("password.special") || "Contains special character"
    }
  ], [password, t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(e);
    onPasswordChange?.(newValue);
  };

  const isPasswordMatch = confirmPassword !== undefined && password && confirmPassword && password === confirmPassword;
  const isPasswordMismatch = confirmPassword !== undefined && password && confirmPassword && password !== confirmPassword;

  return (
    <div className="space-y-3">
      {label && (
        <Label htmlFor={props.id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          {...props}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={handleChange}
          className={cn(
            "pl-10 pr-10",
            "border-slate-300 dark:border-slate-600",
            "focus:border-blue-500 dark:focus:border-blue-400",
            "focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
            className
          )}
        />
        
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Password Match Indicator */}
      {confirmPassword !== undefined && password && confirmPassword && (
        <div className="flex items-center text-xs">
          {isPasswordMatch ? (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <CheckCircle className="w-3 h-3 mr-1" />
              {t("password.passwordMatch") || "Passwords match!"}
            </div>
          ) : isPasswordMismatch ? (
            <div className="flex items-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3 mr-1" />
              {t("password.passwordMismatch") || "Passwords do not match"}
            </div>
          ) : null}
        </div>
      )}

      {/* Password Strength Indicator */}
      {showStrengthIndicator && password && (
        <div className="space-y-2">
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  level <= passwordStrength.score 
                    ? passwordStrength.bgColor 
                    : "bg-slate-200 dark:bg-slate-600"
                )}
              />
            ))}
          </div>
          <p className={cn("text-xs font-medium", passwordStrength.color)}>
            {t("password.passwordStrength") || "Password Strength: "}
            {t(`password.strength.${passwordStrength.label}`) || passwordStrength.label}
          </p>
        </div>
      )}

      {/* Password Requirements */}
      {showRequirements && password && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("password.requirements") || "Password Requirements:"}
          </h4>
          <ul className="space-y-1.5">
            {requirements.map((requirement) => (
              <li key={requirement.key} className="flex items-center text-xs">
                <div 
                  className={cn(
                    "w-2 h-2 rounded-full mr-2 transition-colors duration-200",
                    requirement.test ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
                  )} 
                />
                <span className={cn(
                  "transition-colors duration-200",
                  requirement.test 
                    ? "text-green-700 dark:text-green-400" 
                    : "text-slate-600 dark:text-slate-400"
                )}>
                  {requirement.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

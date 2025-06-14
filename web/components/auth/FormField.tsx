"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface FormFieldProps extends Omit<React.ComponentProps<"input">, "size"> {
  label?: string;
  error?: string;
  success?: string;
  helpText?: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fieldSize?: "sm" | "md" | "lg";
}

export function FormField({
  label,
  error,
  success,
  helpText,
  loading,
  leftIcon,
  rightIcon,
  fieldSize = "md",
  className,
  id,
  required,
  disabled,
  ...props
}: FormFieldProps) {
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  const successId = `${fieldId}-success`;
  
  const sizeClasses = {
    sm: "h-8 text-sm",
    md: "h-9 text-sm",
    lg: "h-10 text-base"
  };

  const paddingClasses = {
    sm: cn(
      leftIcon && "pl-8",
      rightIcon && "pr-8",
      !leftIcon && !rightIcon && "px-3"
    ),
    md: cn(
      leftIcon && "pl-10",
      rightIcon && "pr-10",
      !leftIcon && !rightIcon && "px-3"
    ),
    lg: cn(
      leftIcon && "pl-12",
      rightIcon && "pr-12", 
      !leftIcon && !rightIcon && "px-4"
    )
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  const iconPositions = {
    sm: {
      left: "left-2.5",
      right: "right-2.5"
    },
    md: {
      left: "left-3",
      right: "right-3"
    },
    lg: {
      left: "left-3.5",
      right: "right-3.5"
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor={fieldId}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id={fieldId}
          required={required}
          disabled={disabled}
          className={cn(
            sizeClasses[fieldSize],
            paddingClasses[fieldSize],
            "border-slate-300 dark:border-slate-600",
            "focus:border-blue-500 dark:focus:border-blue-400",
            "focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            success && "border-green-500 focus:border-green-500 focus:ring-green-500/20",
            loading && "pr-10",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={cn(
            error && errorId,
            success && successId,
            helpText && helpId
          ).trim() || undefined}
          {...props}
        />
        
        {/* Left Icon */}
        {leftIcon && (
          <div className={cn(
            "absolute top-1/2 transform -translate-y-1/2 text-slate-400",
            iconPositions[fieldSize].left,
            iconSizes[fieldSize]
          )}>
            {leftIcon}
          </div>
        )}
        
        {/* Right Icon or Loading/Error/Success indicators */}
        <div className={cn(
          "absolute top-1/2 transform -translate-y-1/2 flex items-center space-x-1",
          iconPositions[fieldSize].right
        )}>
          {loading && (
            <Loader2 className={cn(iconSizes[fieldSize], "animate-spin text-blue-500")} />
          )}
          
          {!loading && error && (
            <AlertCircle className={cn(iconSizes[fieldSize], "text-red-500")} />
          )}
          
          {!loading && !error && success && (
            <CheckCircle className={cn(iconSizes[fieldSize], "text-green-500")} />
          )}
          
          {rightIcon && !loading && !error && !success && (
            <div className={cn(iconSizes[fieldSize], "text-slate-400")}>
              {rightIcon}
            </div>
          )}
        </div>
      </div>
      
      {/* Help Text */}
      {helpText && !error && !success && (
        <p 
          id={helpId}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {helpText}
        </p>
      )}
      
      {/* Error Message */}
      {error && (
        <p 
          id={errorId}
          className="text-xs text-red-600 dark:text-red-400 flex items-center"
          role="alert"
        >
          <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
          {error}
        </p>
      )}
      
      {/* Success Message */}
      {success && (
        <p 
          id={successId}
          className="text-xs text-green-600 dark:text-green-400 flex items-center"
          role="status"
        >
          <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
          {success}
        </p>
      )}
    </div>
  );
}

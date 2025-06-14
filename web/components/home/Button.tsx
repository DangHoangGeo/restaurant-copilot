"use client";
import React, { ReactNode } from 'react';
import { Icon } from './Icon';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  iconLeft?: React.ComponentType<{ size?: number; className?: string }> | null;
  iconRight?: React.ComponentType<{ size?: number; className?: string }> | null;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  href?: string;
}

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  iconLeft, 
  iconRight, 
  type = 'button', 
  disabled = false, 
  href, 
  ...props 
}: ButtonProps) => {
  const baseStyle = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out inline-flex items-center justify-center shadow-md hover:shadow-lg";
  
  // Landing page specific primary color
  const primaryColorClass = "bg-sky-500 hover:opacity-90 text-slate-900 dark:text-white focus:ring-sky-500";
  
  const variantStyles = {
    primary: `${primaryColorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    outline: `bg-transparent border-2 border-sky-500 text-sky-500 hover:bg-sky-500/10 focus:ring-sky-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    ghost: `bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400 dark:hover:bg-slate-700 dark:text-slate-200 dark:focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    link: `text-sky-500 hover:underline focus:outline-none focus:ring-1 focus:ring-sky-500 p-0 shadow-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };
  
  const sizeStyles = { 
    sm: "px-3 py-1.5 text-sm", 
    md: "px-4 py-2 text-base", 
    lg: "px-6 py-3 text-lg", 
    xl: "px-8 py-3.5 text-xl" 
  };
  
  const commonProps = { 
    onClick, 
    type, 
    disabled, 
    className: `${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`, 
    ...props 
  };

  if (href) {
    return (
      <a href={href} {...commonProps}>
        {iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 16 : 20} className="mr-2" />}
        {children}
        {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 20} className="ml-2" />}
      </a>
    );
  }
  
  return (
    <button {...commonProps}>
      {iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 16 : 20} className="mr-2" />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 20} className="ml-2" />}
    </button>
  );
};

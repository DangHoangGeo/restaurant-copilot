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
  const baseStyle = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#14100B] transition-colors duration-150 ease-in-out inline-flex items-center justify-center shadow-[0_14px_34px_-22px_rgba(8,7,5,0.8)] hover:shadow-[0_18px_40px_-24px_rgba(8,7,5,0.9)] active:translate-y-px";
  
  const primaryColorClass = "bg-[#c8773e] text-[#fff7e9] hover:bg-[#d98a4c] focus:ring-[#e9a35e]";
  
  const variantStyles = {
    primary: `${primaryColorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `border border-[#f1dcc4]/15 bg-[#fff7e9]/8 text-[#f6e8d3] hover:bg-[#fff7e9]/12 focus:ring-[#e9a35e] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    outline: `border border-[#c8773e]/70 bg-transparent text-[#f3c28d] hover:bg-[#c8773e]/12 focus:ring-[#e9a35e] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    ghost: `bg-transparent text-[#dbc7ad] hover:bg-[#fff7e9]/8 hover:text-[#fff7e9] focus:ring-[#e9a35e] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    link: `p-0 text-[#e9a35e] shadow-none hover:underline focus:outline-none focus:ring-1 focus:ring-[#e9a35e] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
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

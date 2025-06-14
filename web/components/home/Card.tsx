"use client";
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card = ({ children, className = '', noPadding = false }: CardProps) => (
  <div className={`bg-white dark:bg-slate-800 shadow-lg rounded-2xl ${noPadding ? '' : 'p-6 sm:p-8'} ${className}`}>
    {children}
  </div>
);

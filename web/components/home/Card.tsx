"use client";
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card = ({ children, className = '', noPadding = false }: CardProps) => (
  <div className={`rounded-lg border border-[#f1dcc4]/14 bg-[#fff7e9]/7 shadow-[0_22px_54px_-36px_rgba(8,7,5,0.8)] backdrop-blur ${noPadding ? '' : 'p-6 sm:p-8'} ${className}`}>
    {children}
  </div>
);

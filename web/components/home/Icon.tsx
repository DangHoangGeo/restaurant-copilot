"use client";
import React from 'react';
import { Smile } from 'lucide-react';

interface IconProps {
  name: React.ComponentType<{ size?: number; className?: string }>;
  size?: number;
  className?: string;
}

export const Icon = ({ name: IconComponent, size = 20, className = "" }: IconProps) => {
  if (!IconComponent) return <Smile size={size} className={className} />;
  return <IconComponent size={size} className={className} />;
};

"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

export function AuthCard({ 
  title, 
  description, 
  children, 
  className,
  headerActions 
}: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card 
          className={cn(
            "shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm",
            "relative overflow-hidden",
            className
          )}
          role="main"
          aria-labelledby="auth-card-title"
        >
          {/* Background gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20" />
          
          <CardHeader className="relative space-y-1 text-center pb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle 
                  id="auth-card-title"
                  className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent"
                >
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription 
                    className="text-slate-600 dark:text-slate-400 mt-2"
                    id="auth-card-description"
                  >
                    {description}
                  </CardDescription>
                )}
              </div>
              {headerActions && (
                <div className="ml-4" role="toolbar" aria-label="Authentication actions">
                  {headerActions}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="relative space-y-6">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

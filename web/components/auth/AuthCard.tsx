"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
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
  headerActions,
}: AuthCardProps) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-8">
      <div className={cn("w-full max-w-md", className)}>
        {/* Brand mark — mobile only (desktop shows it in hero panel) */}
        <div className="flex lg:hidden items-center justify-center mb-8">
          <Link href={`/${locale}`} className="flex items-center gap-2 group">
            <Image src="/coorder-ai.png" alt="CoOrder.ai" width={32} height={32} className="w-8 h-8" />
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
              coorder<span className="text-orange-500">.ai</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div
          role="main"
          aria-labelledby="auth-card-title"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden"
        >
          {/* Accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />

          <div className="px-7 py-8 sm:px-8">
            {/* Header */}
            <div className="mb-7">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <h1
                    id="auth-card-title"
                    className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
                  >
                    {title}
                  </h1>
                  {description && (
                    <p
                      id="auth-card-description"
                      className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {headerActions && (
                  <div role="toolbar" aria-label="Authentication actions" className="shrink-0 mt-0.5">
                    {headerActions}
                  </div>
                )}
              </div>
            </div>

            {/* Form content */}
            <div className="space-y-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        {/* Brand mark — mobile only */}
        <div className="flex lg:hidden items-center justify-center mb-8">
          <Link href={`/${locale}`} className="flex items-center gap-2 group">
            <Image src="/coorder-ai.png" alt="CoOrder.ai" width={28} height={28} className="w-7 h-7" />
            <span
              className="text-base font-medium text-[#2E2117] dark:text-[#F7F1E9]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              coorder<span style={{ color: "#AB6E3C" }}>.ai</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div
          role="main"
          aria-labelledby="auth-card-title"
          className={cn(
            "rounded-2xl overflow-hidden",
            "border border-[#AB6E3C]/12",
            "bg-[#FEFAF6] dark:bg-[#1E1410]",
            "shadow-[0_8px_32px_rgba(171,110,60,0.08)]"
          )}
        >
          {/* iOS-style warm amber accent bar */}
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg, #36B080 0%, #AB6E3C 50%, #C8954F 100%)" }}
          />

          <div className="px-7 py-8 sm:px-8">
            {/* Header */}
            <div className="mb-7">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <h1
                    id="auth-card-title"
                    className="text-2xl font-medium tracking-tight text-[#2E2117] dark:text-[#F7F1E9]"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {title}
                  </h1>
                  {description && (
                    <p
                      id="auth-card-description"
                      className="text-sm text-[#8B6E5A] dark:text-[#B89078] leading-relaxed"
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

            {/* Content */}
            <div className="space-y-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

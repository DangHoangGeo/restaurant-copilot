import React from "react";

interface PageTemplateProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageTemplate({
  title,
  subtitle,
  action,
  children,
  className = "",
}: PageTemplateProps) {
  return (
    <div className={`mx-auto w-full max-w-[1440px] ${className}`}>
      <header className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight text-[#2E2117] dark:text-[#F7F1E9]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8B6E5A] dark:text-[#C9B7A0]">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

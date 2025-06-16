import React from 'react';

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
  className = ""
}: PageTemplateProps) {
  return (
    <div className={`container mx-auto py-10 px-4 sm:px-6 lg:px-8 ${className}`}>
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="ml-4">
              {action}
            </div>
          )}
        </div>
      </header>
      
      <main>
        {children}
      </main>
    </div>
  );
}

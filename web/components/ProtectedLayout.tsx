"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Initial load complete
    setIsLoading(false);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authenticated content
  return children;
}

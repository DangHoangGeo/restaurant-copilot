"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Clock, Umbrella, QrCode, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface EmployeePortalLayoutProps {
  children: React.ReactNode;
  locale: string;
  userEmail: string;
}

const navItems = [
  { href: "/employee/schedule", icon: Calendar, label: "Schedule" },
  { href: "/employee/attendance", icon: Clock, label: "Hours" },
  { href: "/employee/leave", icon: Umbrella, label: "Days Off" },
  { href: "/employee/checkin", icon: QrCode, label: "Check In" },
];

export function EmployeePortalLayout({ children, locale, userEmail }: EmployeePortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <span className="font-semibold text-sm">Staff Portal</span>
            <p className="text-xs text-muted-foreground leading-none">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t">
        <div className="max-w-lg mx-auto flex">
          {navItems.map(({ href, icon: Icon, label }) => {
            const fullHref = `/${locale}${href}`;
            const isActive = pathname.startsWith(fullHref);
            return (
              <Link
                key={href}
                href={fullHref}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

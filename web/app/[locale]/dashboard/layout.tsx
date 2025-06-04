import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import ProtectedLayout from "../../../components/ProtectedLayout"; // Adjusted path

export default function DashboardLayout({
  children,
  params, // Next.js passes params here
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Create a new supabase client for the context provider
  // This is important to ensure client-side operations.
  const supabase = createClientComponentClient();

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <ProtectedLayout>
        {/* children will be the page.tsx or other nested layouts */}
        {children}
      </ProtectedLayout>
    </SessionContextProvider>
  );
}

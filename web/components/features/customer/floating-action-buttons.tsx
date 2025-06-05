"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import AIChatWidget from "./AIChatWidget"; // Import the new widget

// Assuming FEATURE_FLAGS are available globally or imported
// For now, let's define a placeholder
const FEATURE_FLAGS = {
  aiChat: true, // Example: Enable AI Chat
  // aiAssistant: true, // Could be an alternative flag name
};

// TODO: This component might need access to restaurantSettings for primaryColor
// For now, using a default color or assuming it's passed down if this component
// is refactored to be part of a layout that has restaurantSettings.
// As a quick solution for now, we can define a default.
const DEFAULT_PRIMARY_COLOR = "#000000"; // Example: black

export default function FloatingActionButtons({ restaurantPrimaryColor }: { restaurantPrimaryColor?: string }) {
  const locale = useLocale();
  const t = useTranslations("CustomerLayout"); // For Admin Panel, AI Chat button tooltip
  const tChat = useTranslations("AIChatWidget"); // For AI Chat button SR text if widget is direct

  const [isChatOpen, setIsChatOpen] = useState(false);

  // Use the passed color or default if not available
  const effectivePrimaryColor = restaurantPrimaryColor || DEFAULT_PRIMARY_COLOR;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {(FEATURE_FLAGS.aiChat /*|| FEATURE_FLAGS.aiAssistant*/) && (
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-lg bg-background hover:bg-muted"
            onClick={() => setIsChatOpen(true)}
            aria-label={tChat("openChatLabel")}
          >
            <MessageSquare className="h-6 w-6" />
            {/* <span className="sr-only">{t("aiChat")}</span> // Already covered by aria-label */}
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg bg-background hover:bg-muted"
          asChild
          aria-label={t("adminPanel")}
        >
          <Link href={`/${locale}/dashboard`}>
            <Settings className="h-6 w-6" />
            {/* <span className="sr-only">{t("adminPanel")}</span> // Covered by aria-label */}
          </Link>
        </Button>
      </div>
      {(FEATURE_FLAGS.aiChat /*|| FEATURE_FLAGS.aiAssistant*/) && (
        <AIChatWidget
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          restaurantPrimaryColor={effectivePrimaryColor}
        />
      )}
    </>
  );
}

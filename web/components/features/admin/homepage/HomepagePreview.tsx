"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

interface HomepagePreviewProps {
  locale: string;
}

export function HomepagePreview({ locale }: HomepagePreviewProps) {
  const t = useTranslations("owner.homepage.preview");
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [key, setKey] = useState(0); // For forcing re-render

  const viewModes = [
    {
      value: "desktop" as const,
      label: t("viewModes.desktop"),
      icon: Monitor,
      width: "w-full",
      height: "h-[800px]",
    },
    {
      value: "tablet" as const,
      label: t("viewModes.tablet"),
      icon: Tablet,
      width: "w-[768px]",
      height: "h-[600px]",
    },
    {
      value: "mobile" as const,
      label: t("viewModes.mobile"),
      icon: Smartphone,
      width: "w-[375px]",
      height: "h-[600px]",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKey((prev) => prev + 1)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("buttons.refresh")}
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(`/${locale}/`, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("buttons.openInNewTab")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* View Mode Selector */}
        <div className="flex gap-2">
          {viewModes.map((mode) => {
            const IconComponent = mode.icon;
            return (
              <Button
                key={mode.value}
                variant={viewMode === mode.value ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode(mode.value)}
                className="flex items-center gap-2"
              >
                <IconComponent className="h-4 w-4" />
                {mode.label}
              </Button>
            );
          })}
        </div>

        {/* Preview Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                {t("notice.title")}
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                {t("notice.description")}
              </p>
            </div>
          </div>
        </div>

        {/* Preview Container */}
        <div className="flex justify-center">
          <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg bg-white">
            <div
              className={`${viewModes.find((m) => m.value === viewMode)?.width} ${viewModes.find((m) => m.value === viewMode)?.height} mx-auto`}
              style={{
                maxWidth: "100%",
                transform:
                  viewMode === "desktop"
                    ? "scale(0.8)"
                    : viewMode === "tablet"
                      ? "scale(0.9)"
                      : "scale(1)",
                transformOrigin: "top left",
              }}
            >
              <div className="w-full h-full overflow-auto">
                <iframe
                  key={key}
                  src={`/${locale}/`}
                  title={t("title")}
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="h-2 bg-green-500 rounded mb-2"></div>
            <h4 className="font-semibold text-sm">
              {t("features.responsive.title")}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {t("features.responsive.description")}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="h-2 bg-blue-500 rounded mb-2"></div>
            <h4 className="font-semibold text-sm">
              {t("features.realtime.title")}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {t("features.realtime.description")}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="h-2 bg-purple-500 rounded mb-2"></div>
            <h4 className="font-semibold text-sm">
              {t("features.multilingual.title")}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {t("features.multilingual.description")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Eye, Smartphone, Monitor, Tablet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type ViewportType = "desktop" | "tablet" | "mobile";

export function HomepagePreview({locale}: { locale: string }) {
  const t = useTranslations("owner.homepage.preview");
  const { toast } = useToast();
  const [viewport, setViewport] = useState<ViewportType>("desktop");
  const [isLoading, setIsLoading] = useState(false);

  const handlePreviewClick = async () => {
    setIsLoading(true);
	console.log(locale);
    try {
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Open homepage in new tab
      window.open("/", "_blank");
      
      toast({
        title: t("success.previewOpened"),
        description: t("success.previewOpenedDescription"),
      });
    } catch {
      toast({
        title: t("error.previewFailed"),
        description: t("error.previewFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getViewportDimensions = (viewport: ViewportType) => {
    switch (viewport) {
      case "desktop":
        return { width: "100%", height: "600px" };
      case "tablet":
        return { width: "768px", height: "600px" };
      case "mobile":
        return { width: "375px", height: "600px" };
      default:
        return { width: "100%", height: "600px" };
    }
  };

  const viewportButtons = [
    { type: "desktop" as ViewportType, icon: Monitor, label: t("viewport.desktop") },
    { type: "tablet" as ViewportType, icon: Tablet, label: t("viewport.tablet") },
    { type: "mobile" as ViewportType, icon: Smartphone, label: t("viewport.mobile") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button onClick={handlePreviewClick} disabled={isLoading}>
          <ExternalLink className="w-4 h-4 mr-2" />
          {isLoading ? t("actions.loading") : t("actions.openInNewTab")}
        </Button>
      </div>

      {/* Viewport Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t("viewport.title")}
          </CardTitle>
          <CardDescription>
            {t("viewport.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {viewportButtons.map(({ type, icon: Icon, label }) => (
              <Button
                key={type}
                variant={viewport === type ? "default" : "outline"}
                size="sm"
                onClick={() => setViewport(type)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>
          
          <div className="border rounded-lg overflow-hidden bg-muted/20">
            <div 
              className="mx-auto bg-white border-x border-b transition-all duration-300"
              style={getViewportDimensions(viewport)}
            >
              <iframe
                src="/"
                className="w-full h-full border-0"
                title={t("iframe.title")}
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("status.title")}</CardTitle>
          <CardDescription>
            {t("status.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("status.lastUpdated")}</span>
            <Badge variant="secondary">
              {new Date().toLocaleDateString()}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">{t("status.galleryImages")}</span>
              <div className="text-muted-foreground">8 {t("status.images")}</div>
            </div>
            <div>
              <span className="font-medium">{t("status.ownerStory")}</span>
              <div className="text-muted-foreground">{t("status.configured")}</div>
            </div>
            <div>
              <span className="font-medium">{t("status.signatureDishes")}</span>
              <div className="text-muted-foreground">5 {t("status.dishes")}</div>
            </div>
            <div>
              <span className="font-medium">{t("status.seoSettings")}</span>
              <div className="text-muted-foreground">{t("status.configured")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>{t("tips.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t("tips.tip1")}</li>
            <li>• {t("tips.tip2")}</li>
            <li>• {t("tips.tip3")}</li>
            <li>• {t("tips.tip4")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

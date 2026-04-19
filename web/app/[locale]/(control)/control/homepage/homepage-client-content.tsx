'use client'

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ImageIcon, 
  Users, 
  Star,
  MapPin,
  Edit,
  Eye,
  Settings,
  Image as ImageIconLucide,
  Heart,
  MessageSquare,
} from "lucide-react";
import { GalleryManager } from "./gallery-manager";
import { OwnerStoryEditor } from "./owner-story-editor";
import { SignatureDishesSelector } from "./signature-dishes-selector";
import { HomepagePreview } from "./homepage-preview";

interface HomepageClientContentProps {
  locale: string;
}

export function HomepageClientContent({ locale }: HomepageClientContentProps) {
  const t = useTranslations("owner.homepage");
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    {
      value: "overview",
      label: t("tabs.overview"),
      icon: Eye,
      description: t("tabs.overviewDescription")
    },
    {
      value: "gallery",
      label: t("tabs.gallery"),
      icon: ImageIconLucide,
      description: t("tabs.galleryDescription")
    },
    {
      value: "story",
      label: t("tabs.ownerStory"),
      icon: Users,
      description: t("tabs.storyDescription")
    },
    {
      value: "signature",
      label: t("tabs.signatureDishes"),
      icon: Star,
      description: t("tabs.signatureDescription")
    },
    {
      value: "preview",
      label: t("tabs.preview"),
      icon: Eye,
      description: t("tabs.previewDescription")
    }
  ];

  const overviewSections = [
    {
      title: t("overview.heroSection.title"),
      description: t("overview.heroSection.description"),
      status: "configured", // This would come from API
      icon: ImageIcon,
      color: "bg-green-100 text-green-600"
    },
    {
      title: t("overview.gallerySection.title"),
      description: t("overview.gallerySection.description"),
      status: "needs_attention",
      icon: ImageIconLucide,
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      title: t("overview.ownerStorySection.title"),
      description: t("overview.ownerStorySection.description"),
      status: "missing",
      icon: Users,
      color: "bg-red-100 text-red-600"
    },
    {
      title: t("overview.signatureDishesSection.title"),
      description: t("overview.signatureDishesSection.description"),
      status: "configured",
      icon: Star,
      color: "bg-green-100 text-green-600"
    },
    {
      title: t("overview.reviewsSection.title"),
      description: t("overview.reviewsSection.description"),
      status: "needs_attention",
      icon: MessageSquare,
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      title: t("overview.contactSection.title"),
      description: t("overview.contactSection.description"),
      status: "configured",
      icon: MapPin,
      color: "bg-green-100 text-green-600"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "configured":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">{t("status.configured")}</Badge>;
      case "needs_attention":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">{t("status.needsAttention")}</Badge>;
      case "missing":
        return <Badge variant="destructive" className="bg-red-100 text-red-700">{t("status.missing")}</Badge>;
      default:
        return <Badge variant="secondary">{t("status.unknown")}</Badge>;
    }
  };

  return (
    <>
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              {t("title")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t("description")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveTab("preview")}>
              <Eye className="mr-2 h-4 w-4" />
              {t("buttons.preview")}
            </Button>
            <Button 
              onClick={() => window.open(`/${locale}/`, '_blank')}
              className="bg-primary hover:bg-primary/90"
            >
              <Eye className="mr-2 h-4 w-4" />
              {t("buttons.viewLive")}
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t("overview.title")}
              </CardTitle>
              <CardDescription>
                {t("overview.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overviewSections.map((section, index) => {
                  const IconComponent = section.icon;
                  return (
                    <Card key={index} className="border border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${section.color}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          {getStatusBadge(section.status)}
                        </div>
                        <h3 className="font-semibold text-sm mb-2">{section.title}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                          {section.description}
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            if (index === 1) setActiveTab("gallery");
                            else if (index === 2) setActiveTab("story");
                            else if (index === 3) setActiveTab("signature");
                          }}
                          className="w-full"
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          {t("buttons.configure")}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t("overview.stats.title")}</CardTitle>
              <CardDescription>{t("overview.stats.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <ImageIconLucide className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">8</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t("overview.stats.galleryImages")}</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Star className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">5</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t("overview.stats.signatureDishes")}</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-600">4.8</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t("overview.stats.rating")}</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold text-orange-600">120</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t("overview.stats.reviews")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Management Tab */}
        <TabsContent value="gallery" className="space-y-6">
          <GalleryManager locale={locale} />
        </TabsContent>

        {/* Owner Story Tab */}
        <TabsContent value="story" className="space-y-6">
          <OwnerStoryEditor locale={locale} />
        </TabsContent>

        {/* Signature Dishes Tab */}
        <TabsContent value="signature" className="space-y-6">
          <SignatureDishesSelector locale={locale} />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <HomepagePreview />
        </TabsContent>
      </Tabs>
    </>
  );
}

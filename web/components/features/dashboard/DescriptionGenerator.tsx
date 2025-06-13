"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DescriptionGeneratorProps {
  restaurantName: string;
  onGenerated: (descriptions: {
    description_en: string;
    description_ja: string;
    description_vi: string;
  }) => void;
  disabled?: boolean;
}

export function DescriptionGenerator({ 
  restaurantName, 
  onGenerated, 
  disabled = false 
}: DescriptionGeneratorProps) {
  const t = useTranslations("Dashboard.Settings");
  const [isGenerating, setIsGenerating] = useState(false);
  const [cuisine, setCuisine] = useState("");
  const [atmosphere, setAtmosphere] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [location, setLocation] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const generateDescriptions = async () => {
    if (!restaurantName.trim()) {
      toast.error(t("aiDescription.errors.missingName"));
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/v1/ai/generate-restaurant-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantName,
          cuisine: cuisine.trim(),
          atmosphere: atmosphere.trim(),
          specialties: specialties.trim(),
          location: location.trim(),
          baseDescription: additionalInfo.trim(),
          language: 'en' // Default language for generation
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate descriptions');
      }

      const result = await response.json();
      
      onGenerated({
        description_en: result.en,
        description_ja: result.ja,
        description_vi: result.vi,
      });

      toast.success(t("aiDescription.success"));
      
      // Clear the form
      setCuisine("");
      setAtmosphere("");
      setSpecialties("");
      setLocation("");
      setAdditionalInfo("");
      
    } catch (error) {
      console.error('Error generating descriptions:', error);
      toast.error(t("aiDescription.errors.generationFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
      <div className="flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-blue-600" />
        <Label className="text-base font-medium text-blue-900 dark:text-blue-100">
          {t("aiDescription.title")}
        </Label>
      </div>

      <div className="text-sm text-muted-foreground">
        {t("aiDescription.subtitle")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cuisine" className="text-sm">{t("aiDescription.cuisine")}</Label>
          <Input
            id="cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder={t("aiDescription.cuisinePlaceholder")}
            disabled={disabled || isGenerating}
          />
        </div>

        <div>
          <Label htmlFor="atmosphere" className="text-sm">{t("aiDescription.atmosphere")}</Label>
          <Input
            id="atmosphere"
            value={atmosphere}
            onChange={(e) => setAtmosphere(e.target.value)}
            placeholder={t("aiDescription.atmospherePlaceholder")}
            disabled={disabled || isGenerating}
          />
        </div>

        <div>
          <Label htmlFor="specialties" className="text-sm">{t("aiDescription.specialties")}</Label>
          <Input
            id="specialties"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder={t("aiDescription.specialtiesPlaceholder")}
            disabled={disabled || isGenerating}
          />
        </div>

        <div>
          <Label htmlFor="location" className="text-sm">{t("aiDescription.location")}</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("aiDescription.locationPlaceholder")}
            disabled={disabled || isGenerating}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="additionalInfo" className="text-sm">{t("aiDescription.additionalInfo")}</Label>
        <Textarea
          id="additionalInfo"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder={t("aiDescription.additionalInfoPlaceholder")}
          disabled={disabled || isGenerating}
          rows={3}
        />
      </div>

      <Button 
        onClick={generateDescriptions} 
        disabled={disabled || isGenerating || !restaurantName.trim()}
        className="w-full"
      >
        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isGenerating ? t("aiDescription.generating") : t("aiDescription.generate")}
      </Button>

      <div className="text-xs text-muted-foreground">
        {t("aiDescription.disclaimer")}
      </div>
    </div>
  );
}

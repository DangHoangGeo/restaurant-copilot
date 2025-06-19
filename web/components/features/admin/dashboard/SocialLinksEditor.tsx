"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Facebook, Instagram, Twitter, Globe } from "lucide-react";

interface SocialLinks {
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  website?: string | null;
}

interface SocialLinksEditorProps {
  value: SocialLinks;
  onChange: (links: SocialLinks) => void;
  disabled?: boolean;
}

export function SocialLinksEditor({ value, onChange, disabled = false }: SocialLinksEditorProps) {
  const t = useTranslations("owner.dashboard");

  const updateLink = (platform: keyof SocialLinks, url: string) => {
    onChange({
      ...value,
      [platform]: url || null
    });
  };

  const platforms = [
    {
      key: 'facebook' as const,
      label: 'Facebook',
      icon: Facebook,
      placeholder: 'https://facebook.com/yourrestaurant'
    },
    {
      key: 'instagram' as const,
      label: 'Instagram',
      icon: Instagram,
      placeholder: 'https://instagram.com/yourrestaurant'
    },
    {
      key: 'twitter' as const,
      label: 'Twitter',
      icon: Twitter,
      placeholder: 'https://twitter.com/yourrestaurant'
    },
    {
      key: 'website' as const,
      label: 'Website',
      icon: Globe,
      placeholder: 'https://yourrestaurant.com'
    }
  ];

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">{t("labels.socialLinks")}</Label>
      
      <div className="grid gap-3">
        {platforms.map(platform => {
          const Icon = platform.icon;
          
          return (
            <div key={platform.key} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-24">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{platform.label}</span>
              </div>
              <Input
                type="url"
                value={value[platform.key] || ''}
                onChange={(e) => updateLink(platform.key, e.target.value)}
                placeholder={platform.placeholder}
                disabled={disabled}
                className="flex-1"
              />
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        {t("socialLinks.helpText")}
      </div>
    </div>
  );
}

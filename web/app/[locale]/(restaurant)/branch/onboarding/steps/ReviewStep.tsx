'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Loader2, Building2, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { ReviewStepProps } from "../types";

export function ReviewStep({ data, onComplete, onBack, isLoading }: ReviewStepProps) {
  const t = useTranslations('owner.onboarding.steps.review');

  const getLanguageName = (lang: string) => {
    switch (lang) {
      case 'en': return 'English';
      case 'ja': return '日本語';
      case 'vi': return 'Tiếng Việt';
      default: return lang;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-600" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200">
            {t('description')}
          </p>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">{t('sections.basicInfo.title')}</h3>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('sections.basicInfo.fields.name')}:
                </span>
                <p className="font-medium">{data.name}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('sections.basicInfo.fields.subdomain')}:
                </span>
                <p className="font-medium">{data.subdomain}.coorder.ai</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('sections.basicInfo.fields.language')}:
                </span>
                <p className="font-medium">{getLanguageName(data.default_language)}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('sections.basicInfo.fields.brandColor')}:
                </span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: data.brand_color }}
                  />
                  <span className="font-medium">{data.brand_color}</span>
                </div>
              </div>
            </div>
            
            {(data.phone || data.email || data.address || data.website) && (
              <div className="border-t pt-3 space-y-2">
                {data.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('sections.basicInfo.fields.phone')}:
                    </span>
                    <p>{data.phone}</p>
                  </div>
                )}
                {data.email && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('sections.basicInfo.fields.email')}:
                    </span>
                    <p>{data.email}</p>
                  </div>
                )}
                {data.address && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('sections.basicInfo.fields.address')}:
                    </span>
                    <p>{data.address}</p>
                  </div>
                )}
                {data.website && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('sections.basicInfo.fields.website')}:
                    </span>
                    <p>{data.website}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Generated Content */}
        {(data.hero_title || data.hero_subtitle || data.owner_story_en || data.signature_dishes?.length) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">{t('sections.aiContent.title')}</h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {t('sections.aiContent.badge')}
              </Badge>
            </div>
            
            <div className="space-y-4">
              {(data.hero_title || data.hero_subtitle) && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('sections.aiContent.fields.hero')}:
                  </span>
                  <h4 className="text-xl font-bold mt-1" style={{ color: data.brand_color }}>
                    {data.hero_title}
                  </h4>
                  {data.hero_subtitle && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {data.hero_subtitle}
                    </p>
                  )}
                </div>
              )}

              {data.owner_story_en && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('sections.aiContent.fields.ownerStory')}:
                  </span>
                  <div className="space-y-2 mt-2">
                    <div>
                      <span className="text-xs font-medium text-blue-600">EN:</span>
                      <p className="text-sm">{data.owner_story_en}</p>
                    </div>
                    {data.owner_story_ja && (
                      <div>
                        <span className="text-xs font-medium text-blue-600">JP:</span>
                        <p className="text-sm">{data.owner_story_ja}</p>
                      </div>
                    )}
                    {data.owner_story_vi && (
                      <div>
                        <span className="text-xs font-medium text-blue-600">VI:</span>
                        <p className="text-sm">{data.owner_story_vi}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {data.signature_dishes && data.signature_dishes.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('sections.aiContent.fields.signatureDishes')}:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {data.signature_dishes.map((dish, index) => (
                      <div key={index} className="bg-white dark:bg-gray-700 p-3 rounded border">
                        <h5 className="font-medium">{dish.name_en}</h5>
                        {dish.description_en && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {dish.description_en}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Media Content */}
        {(data.logo_url || data.owner_photo_url || data.gallery_images?.length) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">{t('sections.media.title')}</h3>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.logo_url && (
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('sections.media.fields.logo')}
                    </span>
                    <div className="mt-2">
                      <Image
                        src={data.logo_url}
                        alt="Logo"
                        width={64}
                        height={64}
                        className="object-contain mx-auto border rounded"
                      />
                    </div>
                  </div>
                )}
                
                {data.owner_photo_url && (
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('sections.media.fields.ownerPhoto')}
                    </span>
                    <div className="mt-2">
                      <Image
                        src={data.owner_photo_url}
                        alt="Owner"
                        width={64}
                        height={64}
                        className="object-cover mx-auto border rounded-full"
                      />
                    </div>
                  </div>
                )}
                
                {data.gallery_images && data.gallery_images.length > 0 && (
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('sections.media.fields.gallery')} ({data.gallery_images.length})
                    </span>
                    <div className="mt-2 flex gap-1 justify-center">
                      {data.gallery_images.slice(0, 3).map((url, index) => (
                        <Image
                          key={index}
                          src={url}
                          alt={`Gallery ${index + 1}`}
                          width={48}
                          height={48}
                          className="object-cover border rounded"
                        />
                      ))}
                      {data.gallery_images.length > 3 && (
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 border rounded flex items-center justify-center text-xs">
                          +{data.gallery_images.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completion Actions */}
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              {t('completion.title')}
            </h3>
          </div>
          <p className="text-sm text-green-800 dark:text-green-200 mb-4">
            {t('completion.description')}
          </p>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <li>• {t('completion.features.homepage')}</li>
            <li>• {t('completion.features.settings')}</li>
            <li>• {t('completion.features.menu')}</li>
            <li>• {t('completion.features.orders')}</li>
          </ul>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack} disabled={isLoading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('buttons.back')}
          </Button>
          
          <Button 
            onClick={onComplete} 
            disabled={isLoading}
            className="bg-gradient-to-r from-green-600 to-blue-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('buttons.completing')}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('buttons.complete')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

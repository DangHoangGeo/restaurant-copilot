'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Sparkles, Loader2, Wand2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { OnboardingAIResponse } from '@/shared/types/ai';
import type { OnboardingData, AIGenerationStepProps } from "../types";

const aiGenerationSchema = z.object({
  cuisine: z.string().optional(),
  city: z.string().optional(),
  style: z.string().optional(),
  specialties: z.string().optional(),
});

type AIGenerationFormData = z.infer<typeof aiGenerationSchema>;

export function AIGenerationStep({ data, onUpdate, onNext, onBack }: AIGenerationStepProps) {
  const t = useTranslations('owner.onboarding.steps.aiGeneration');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<OnboardingAIResponse | null>(null);
  const [showGenerated, setShowGenerated] = useState(false);

  const form = useForm<AIGenerationFormData>({
    resolver: zodResolver(aiGenerationSchema),
    defaultValues: {
      cuisine: '',
      city: '',
      style: '',
      specialties: '',
    },
  });

  const generateContent = async (formData: AIGenerationFormData) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/v1/restaurant/onboarding/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          cuisine: formData.cuisine,
          city: formData.city,
          style: formData.style,
          specialties: formData.specialties,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const aiResponse: OnboardingAIResponse = await response.json();
      setGeneratedContent(aiResponse);
      setShowGenerated(true);
      toast.success(t('generation.success'));
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(t('generation.error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptGenerated = () => {
    if (!generatedContent) return;

    const updates: Partial<OnboardingData> = {
      hero_title: generatedContent.hero.title,
      hero_subtitle: generatedContent.hero.subtitle,
      owner_story_en: generatedContent.ownerStory.story_en,
      owner_story_ja: generatedContent.ownerStory.story_ja,
      owner_story_vi: generatedContent.ownerStory.story_vi,
      signature_dishes: generatedContent.signatureDishes.map(dish => ({
        name_en: dish.name_en,
        name_ja: dish.name_ja,
        name_vi: dish.name_vi,
        description_en: dish.description_en,
        description_ja: dish.description_ja,
        description_vi: dish.description_vi,
        price: 0, // Default price, can be set later
      })),
    };

    onUpdate(updates);
    onNext();
  };

  const skipAI = () => {
    onNext();
  };

  if (showGenerated && generatedContent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            {t('preview.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Preview */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2" style={{ color: data.brand_color }}>
              {generatedContent.hero.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {generatedContent.hero.subtitle}
            </p>
          </div>

          {/* Owner Story Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('preview.ownerStory')}</h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-blue-600">English:</span>
                  <p className="text-sm mt-1">{generatedContent.ownerStory.story_en}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-600">日本語:</span>
                  <p className="text-sm mt-1">{generatedContent.ownerStory.story_ja}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-600">Tiếng Việt:</span>
                  <p className="text-sm mt-1">{generatedContent.ownerStory.story_vi}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Dishes Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('preview.signatureDishes')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedContent.signatureDishes.map((dish, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{dish.name_en}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {dish.description_en}
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div><strong>JP:</strong> {dish.name_ja}</div>
                    <div><strong>VI:</strong> {dish.name_vi}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowGenerated(false)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('buttons.regenerate')}
              </Button>
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('buttons.back')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={skipAI}>
                {t('buttons.skip')}
              </Button>
              <Button onClick={acceptGenerated} className="bg-gradient-to-r from-purple-600 to-blue-600">
                <Sparkles className="h-4 w-4 mr-2" />
                {t('buttons.accept')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-purple-600" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                  {t('aiInfo.title')}
                </h3>
              </div>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                {t('aiInfo.description')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cuisine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.cuisine.label')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('fields.cuisine.placeholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.city.label')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('fields.city.placeholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.style.label')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('fields.style.placeholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.specialties.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('fields.specialties.placeholder')}
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between pt-6">
              <Button variant="outline" onClick={onBack} disabled={isGenerating}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('buttons.back')}
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={skipAI}
                  disabled={isGenerating}
                >
                  {t('buttons.skip')}
                </Button>
                <Button
                  onClick={form.handleSubmit(generateContent)}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('buttons.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('buttons.generate')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

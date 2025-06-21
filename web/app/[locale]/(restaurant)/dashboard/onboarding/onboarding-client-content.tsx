'use client';

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle } from "lucide-react";
import { useRestaurantSettings } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import type { OnboardingData } from "./types";

// Import step components
import { BasicInfoStep, AIGenerationStep, MediaUploadStep, ReviewStep } from "./steps";

interface OnboardingClientContentProps {
  locale: string;
}

type OnboardingStep = 'basic' | 'ai-generation' | 'media' | 'review';

export function OnboardingClientContent({ locale }: OnboardingClientContentProps) {
  const t = useTranslations("owner.onboarding");
  const router = useRouter();
  const { updateSettings } = useRestaurantSettings();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('basic');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    name: '',
    subdomain: '',
    default_language: locale as 'en' | 'ja' | 'vi',
    brand_color: '#3B82F6',
  });
  const [isLoading, setIsLoading] = useState(false);

  const steps: Array<{
    id: OnboardingStep;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'basic',
      title: t('steps.basic.title'),
      description: t('steps.basic.description'),
      icon: Sparkles,
    },
    {
      id: 'ai-generation',
      title: t('steps.aiGeneration.title'),
      description: t('steps.aiGeneration.description'),
      icon: Sparkles,
    },
    {
      id: 'media',
      title: t('steps.media.title'),
      description: t('steps.media.description'),
      icon: Sparkles,
    },
    {
      id: 'review',
      title: t('steps.review.title'),
      description: t('steps.review.description'),
      icon: CheckCircle,
    },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Transform the onboarding data to match API schema
      const apiData = {
        // Basic restaurant settings
        name: onboardingData.name,
        phone: onboardingData.phone,
        email: onboardingData.email,
        address: onboardingData.address,
        website: onboardingData.website,
        
        // Hero content - map single fields to language-specific fields
        hero_title_en: onboardingData.hero_title,
        hero_title_ja: onboardingData.hero_title,
        hero_title_vi: onboardingData.hero_title,
        hero_subtitle_en: onboardingData.hero_subtitle,
        hero_subtitle_ja: onboardingData.hero_subtitle,
        hero_subtitle_vi: onboardingData.hero_subtitle,
        
        // Owner story content
        owner_story_en: onboardingData.owner_story_en,
        owner_story_ja: onboardingData.owner_story_ja,
        owner_story_vi: onboardingData.owner_story_vi,
        
        // Media URLs
        logo_url: onboardingData.logo_url,
        owner_photo_url: onboardingData.owner_photo_url,
        gallery_images: onboardingData.gallery_images,
        
        // Signature dishes
        signature_dishes: onboardingData.signature_dishes,
      };

      const response = await fetch('/api/v1/restaurant/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      const result = await response.json();
      
      // Update the restaurant context
      updateSettings(result.restaurant);
      
      // Show success message and warnings if any
      if (result.warnings && result.warnings.length > 0) {
        toast.success(t('completion.success_with_warnings'));
        // Show warnings in a separate toast
        setTimeout(() => {
          result.warnings.forEach((warning: string) => {
            toast.warning(`${t('completion.warning_prefix')}: ${warning}`);
          });
        }, 1000);
      } else {
        toast.success(t('completion.success'));
      }
      
      // Redirect to homepage management
      router.push(`/${locale}/dashboard/homepage`);
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error(t('completion.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <BasicInfoStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={handleNext}
            locale={locale}
          />
        );
      case 'ai-generation':
        return (
          <AIGenerationStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'media':
        return (
          <MediaUploadStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'review':
        return (
          <ReviewStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onComplete={handleComplete}
            onBack={handleBack}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          {t('description')}
        </p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">
            {t('aiAssisted')}
          </span>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                const IconComponent = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-12 h-1 mx-2 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <Badge variant="secondary">
              {currentStepIndex + 1} / {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="mt-2">
            <h3 className="font-semibold text-lg">
              {steps[currentStepIndex].title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {steps[currentStepIndex].description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {renderCurrentStep()}
      </motion.div>
    </div>
  );
}

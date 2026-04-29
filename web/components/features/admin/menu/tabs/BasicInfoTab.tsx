'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { StreamlinedMenuItemFormData } from '../ItemModal';
import type { MenuItemCategory } from '@/shared/types/menu';
import { optimizeMenuImageFile } from '@/lib/client/menu-image-processing';

interface BasicInfoTabProps {
  form: UseFormReturn<StreamlinedMenuItemFormData>;
  ownerLanguage: 'en' | 'ja' | 'vi';
  categories: MenuItemCategory[];
  showAiTools?: boolean;
  onTranslate?: (text: string, field: string, context: 'item' | 'topping') => Promise<{ en: string; ja: string; vi: string }>;
  onGenerateDescription?: (text: string, initialData: string) => Promise<{ en: string; ja: string; vi: string }>;
  onGenerateAI?: (itemName: string, existingDescription: string) => Promise<{ 
    name_en: string; 
    name_ja: string; 
    name_vi: string;
    description_en: string; 
    description_ja: string; 
    description_vi: string;
    tags: string[];
  }>;
}

export function BasicInfoTab({
  form,
  ownerLanguage,
  categories,
  showAiTools = true,
  onTranslate,
  onGenerateDescription,
  onGenerateAI
}: BasicInfoTabProps) {
  const t = useTranslations('owner.menu.itemModal.basic');
  const advancedT = useTranslations('owner.menu.itemModal.advanced');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Watch for image_url changes and update preview accordingly
  const imageUrl = form.watch("image_url");
  const imageFile = form.watch("imageFile");
  
  useEffect(() => {
    if (!imageFile && imageUrl && imageUrl !== imagePreview) {
      setImagePreview(imageUrl);
    } else if (!imageUrl && !imageFile && imagePreview) {
      setImagePreview(null);
    }
  }, [imageUrl, imageFile, imagePreview]);

  const resetCropDraft = () => {
    if (sourceImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(sourceImagePreview);
    }
    setSourceImageFile(null);
    setSourceImagePreview(null);
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t('imageCompressError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('imageCompressError'));
      return;
    }
    resetCropDraft();
    setSourceImageFile(file);
    setSourceImagePreview(URL.createObjectURL(file));
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
  };

  const applyImageCrop = async (field: { onChange: (value: File | null) => void }) => {
    if (!sourceImageFile) return;
    try {
      setIsProcessingImage(true);
      const optimized = await optimizeMenuImageFile(sourceImageFile, {
        zoom: cropZoom,
        offsetX: cropOffsetX,
        offsetY: cropOffsetY,
      });
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      field.onChange(optimized.file);
      form.setValue("image_url", "");
      setImagePreview(optimized.previewUrl);
      resetCropDraft();
      toast.success(t('imageUploadSuccess'));
    } catch (error) {
      toast.error(t('imageCompressError'));
      console.error(error);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Helper function to remove image
  const handleRemoveImage = (field: { onChange: (value: File | null) => void }) => {
    resetCropDraft();
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    field.onChange(null);
    form.setValue("image_url", "");
  };
  const handleTranslate = async (sourceText: string, fieldType: 'name' | 'description') => {
    if (!onTranslate || !sourceText.trim()) return;
    
    setIsTranslating(true);
    try {
      const translations = await onTranslate(sourceText, fieldType, 'item');
      
      // Auto-fill all language fields
      if (fieldType === 'name') {
        form.setValue('name_en', translations.en);
        form.setValue('name_ja', translations.ja);
        form.setValue('name_vi', translations.vi);
      } else if (fieldType === 'description') {
        form.setValue('description_en', translations.en);
        form.setValue('description_ja', translations.ja);
        form.setValue('description_vi', translations.vi);
      }
      
      toast.success(t('translationsGeneratedSuccess'));
    } catch (error) {
      console.error('Translation failed:', error);
      toast.error(t('translationFailed'));
    } finally {
      setIsTranslating(false);
    }
  };

  // Helper function to generate description using AI
  const handleGenerateDescription = async () => {
    if (!onGenerateDescription) return;
    
    const itemName = form.getValues(
      ownerLanguage === 'en' ? 'name_en' : 
      ownerLanguage === 'ja' ? 'name_ja' : 'name_vi'
    );
    
    if (!itemName?.trim()) {
      toast.error(t('itemNameRequired'));
      return;
    }
    
    setIsGeneratingDescription(true);
    try {
      const descriptions = await onGenerateDescription(itemName, '');
      
      // Auto-fill all language descriptions
      form.setValue('description_en', descriptions.en);
      form.setValue('description_ja', descriptions.ja);
      form.setValue('description_vi', descriptions.vi);
      
      toast.success(t('descriptionGeneratedSuccess'));
    } catch (error) {
      console.error('Description generation failed:', error);
      toast.error(t('descriptionGenerationFailed'));
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Combined AI generation function for names, descriptions, and tags
  const handleGenerateAI = async () => {
    if (!onGenerateAI) return;
    
    const itemName = form.getValues(
      ownerLanguage === 'en' ? 'name_en' : 
      ownerLanguage === 'ja' ? 'name_ja' : 'name_vi'
    );
    
    if (!itemName?.trim()) {
      toast.error(t('itemNameRequired'));
      return;
    }

    const existingDescription = form.getValues(
      ownerLanguage === 'en' ? 'description_en' :
      ownerLanguage === 'ja' ? 'description_ja' : 'description_vi'
    );

    setIsGeneratingAI(true);
    try {
      const aiResult = await onGenerateAI(itemName, existingDescription || '');
      
      // Auto-fill all language fields
      form.setValue('name_en', aiResult.name_en);
      form.setValue('name_ja', aiResult.name_ja);
      form.setValue('name_vi', aiResult.name_vi);
      form.setValue('description_en', aiResult.description_en);
      form.setValue('description_ja', aiResult.description_ja);
      form.setValue('description_vi', aiResult.description_vi);
      form.setValue('tags', aiResult.tags);
      
      toast.success(t('aiContentGeneratedSuccess'));
    } catch (error) {
      console.error('AI generation failed:', error);
      toast.error(t('aiGenerationFailed'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const primaryNameField = ownerLanguage === 'en' ? 'name_en' : 
                          ownerLanguage === 'ja' ? 'name_ja' : 'name_vi';
  
  const primaryDescField = ownerLanguage === 'en' ? 'description_en' : 
                          ownerLanguage === 'ja' ? 'description_ja' : 'description_vi';

  return (
    <div className="space-y-4 pb-4 sm:space-y-6 sm:pb-6">
      {/* Header */}
      <div className="mb-4 text-left sm:mb-6 sm:text-center">
        <h3 className="text-lg font-semibold mb-2">{t('title')}</h3>
        <p className="hidden text-sm text-muted-foreground sm:block">
          {t('description')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Left Column: Text Fields */}
        <div className="space-y-4">
          {/* Item Name */}
          <FormField
            control={form.control}
            name={primaryNameField}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-medium">
                  {t('itemNameLabel')} *
                </FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder={t('itemNamePlaceholder')}
                    className="text-sm sm:text-base"
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-medium">
                  {advancedT('category_label')} *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder={advancedT('select_category_placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fallback: Individual Translation Button (only if combined AI not available) */}
          {showAiTools && onTranslate && !onGenerateAI && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nameValue = form.getValues(primaryNameField);
                if (nameValue) {
                  handleTranslate(nameValue, 'name');
                }
              }}
              disabled={isTranslating || !form.getValues(primaryNameField)}
              className="w-full border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-200"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              {isTranslating ? t('translating') : t('translateButton')}
            </Button>
          )}

          {/* Description */}
          <FormField
            control={form.control}
            name={primaryDescField}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-medium">
                  {t('ingredientsLabel')}
                </FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder={t('ingredientsPlaceholder')}
                    className="min-h-[100px] text-sm sm:text-base resize-none"
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fallback: Individual Description Generator (only if combined AI not available) */}
          {showAiTools && onGenerateDescription && !onGenerateAI && (
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={handleGenerateDescription}
              disabled={isGeneratingDescription || !form.getValues(primaryNameField)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {isGeneratingDescription ? t('generating') : t('generateDescriptionButton')}
            </Button>
          )}

          {/* Combined AI Generation Button */}
          {showAiTools && onGenerateAI && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateAI}
              disabled={isGeneratingAI || !form.getValues(primaryNameField)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              {isGeneratingAI ? t('generatingContent') : t('generateAllButton')}
            </Button>
          )}

          {/* Price */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-medium">
                  {t('priceLabel')} *
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      ¥
                    </span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field} 
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      className="pl-8 text-base"
                      placeholder={t('pricePlaceholder')}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Right Column: Image Upload */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="imageFile"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-medium">
                  {t('itemPhotoLabel')}
                </FormLabel>
                <FormControl>
                  <Card className="border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50">
                    <CardContent className="p-3 sm:p-6">
                      {sourceImagePreview ? (
                        <div className="space-y-4">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#d8c2a8] bg-[#f4e7d5] dark:border-white/10 dark:bg-black/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sourceImagePreview}
                              alt=""
                              className="absolute object-cover"
                              style={{
                                width: `${100 * cropZoom}%`,
                                height: `${100 * cropZoom}%`,
                                left: `${50 + cropOffsetX * 0.35}%`,
                                top: `${50 + cropOffsetY * 0.35}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                            <div className="pointer-events-none absolute inset-0 border border-white/50 dark:border-white/25" />
                          </div>
                          <div className="grid gap-3 rounded-xl border border-[#ead9c6] bg-[#fff8ee] p-3 dark:border-white/10 dark:bg-black/20">
                            <ImageRangeControl
                              label={t('cropZoomLabel')}
                              min={1}
                              max={3}
                              step={0.05}
                              value={cropZoom}
                              onChange={setCropZoom}
                            />
                            <ImageRangeControl
                              label={t('cropHorizontalLabel')}
                              min={-100}
                              max={100}
                              step={1}
                              value={cropOffsetX}
                              onChange={setCropOffsetX}
                            />
                            <ImageRangeControl
                              label={t('cropVerticalLabel')}
                              min={-100}
                              max={100}
                              step={1}
                              value={cropOffsetY}
                              onChange={setCropOffsetY}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={resetCropDraft}
                              className="rounded-lg border-[#d8c2a8] bg-white/75 dark:border-white/10 dark:bg-white/5"
                            >
                              {t('removeButton')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => applyImageCrop(field)}
                              disabled={isProcessingImage}
                              className="rounded-lg bg-[#9b6339] text-white hover:bg-[#7d4d2a] dark:bg-[#f5b76d] dark:text-[#211610] dark:hover:bg-[#ffd08b]"
                            >
                              {isProcessingImage ? t('imageProcessing') : t('applyImageButton')}
                            </Button>
                          </div>
                        </div>
                      ) : imagePreview ? (
                        <div className="space-y-4">
                          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imagePreview}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveImage(field)}
                              className="flex-1"
                            >
                              {t('removeButton')}
                            </Button>
                            <label className="flex-1">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file);
                                  }
                                  e.target.value = '';
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {t('replaceButton')}
                              </Button>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file);
                              }
                              e.target.value = '';
                            }}
                          />
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-sm font-medium mb-1">{t('uploadTitle')}</p>
                            <p className="text-xs text-muted-foreground mb-4">
                              {t('uploadHint')}
                            </p>
                            <Button type="button" variant="outline" size="sm">
                              <Upload className="mr-2 h-4 w-4" />
                              {t('chooseFileButton')}
                            </Button>
                          </div>
                        </label>
                      )}
                    </CardContent>
                  </Card>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Auto-generated translations - now editable */}
      {(onTranslate || onGenerateAI) && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 text-sm">{t('aiContentTitle')}</h4>
            <div className="space-y-4">
              {ownerLanguage !== 'en' && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('englishLabel')}</label>
                  <FormField
                    control={form.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('englishNamePlaceholder')}
                            className="text-sm"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={t('englishDescriptionPlaceholder')}
                            className="text-xs resize-none min-h-[100px]"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
              {ownerLanguage !== 'ja' && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('japaneseLabel')}</label>
                  <FormField
                    control={form.control}
                    name="name_ja"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('japaneseNamePlaceholder')}
                            className="text-sm"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description_ja"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={t('japaneseDescriptionPlaceholder')}
                            className="text-xs resize-none min-h-[100px]"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
              {ownerLanguage !== 'vi' && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('vietnameseLabel')}</label>
                  <FormField
                    control={form.control}
                    name="name_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('vietnameseNamePlaceholder')}
                            className="text-sm"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={t('vietnameseDescriptionPlaceholder')}
                            className="text-xs resize-none min-h-[100px]"
                            value={field.value ?? ''}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
            
            {/* AI-Generated Tags */}
            {onGenerateAI && form.watch('tags') && (form.watch('tags') || []).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-xs text-muted-foreground mb-2 block">{t('aiTagsLabel')}</label>
                <div className="flex flex-wrap gap-2">
                  {(form.watch('tags') || []).map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('aiTagsDescription')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ImageRangeControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1.5 text-xs font-medium text-[#6f4d35] dark:text-[#f1d1b1]">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#9b6339] dark:accent-[#f5b76d]"
      />
    </label>
  );
}

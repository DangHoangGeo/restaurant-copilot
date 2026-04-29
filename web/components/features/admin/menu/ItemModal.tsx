'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import { Check, ChevronLeft, ChevronRight, Languages, PenSquare } from "lucide-react";
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { VariantsOptionsTab } from './tabs/VariantsOptionsTab';
import { AdvancedSettingsTab } from './tabs/AdvancedSettingsTab';
import type { MenuItem, MenuItemCategory } from '@/shared/types/menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

// Simplified schema for the streamlined form
const streamlinedMenuItemSchema = z.object({
  id: z.string().optional(),
  
  // Basic Info Tab (Required)
  name_en: z.string().min(1, "Item name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  description_en: z.string().optional(),
  description_ja: z.string().optional(),
  description_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  imageFile: z.instanceof(File).optional().nullable(),
  image_url: z.string().optional(),
  tags: z.array(z.string()).optional(), // AI-generated food tags
  
  // Variants & Options Tab (Optional)
  toppings: z.array(z.object({
    id: z.string().optional(),
    name_en: z.string().min(1, "English name is required"),
    name_ja: z.string().optional(),
    name_vi: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be non-negative"),
    position: z.coerce.number().int().min(0),
  })).optional(),
  sizes: z.array(z.object({
    id: z.string().optional(),
    size_key: z.string().min(1, "Size key is required"),
    name_en: z.string().min(1, "English name is required"),
    name_ja: z.string().optional(),
    name_vi: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be non-negative"),
    position: z.coerce.number().int().min(0),
  })).optional(),
  stock_level: z.coerce.number().min(0).optional().nullable(),
  
  // Advanced Settings Tab (Optional)
  category_id: z.string().min(1, "Category is required"),
  available: z.boolean(),
  weekday_visibility: z.array(z.number().min(1).max(7)),
  position: z.coerce.number().int().min(0).optional(),
});

export type StreamlinedMenuItemFormData = z.infer<typeof streamlinedMenuItemSchema>;

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: MenuItem & {
    stock_level?: number;
    toppings?: Array<{
      id?: string;
      name_en: string;
      name_ja?: string;
      name_vi?: string;
      price: number;
      position: number;
    }>;
    menu_item_sizes?: Array<{
      id?: string;
      size_key: string;
      name_en: string;
      name_ja?: string;
      name_vi?: string;
      price: number;
      position: number;
    }>;
  };
  categories: MenuItemCategory[];
  onSave: (data: StreamlinedMenuItemFormData, menuItemId?: string) => Promise<void>;
  texts: {
    saveButton: string;
    cancelButton: string;
    title: string;
    successMessage: string;
    errorMessage: string;
  };
  ownerLanguage?: 'en' | 'ja' | 'vi';
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

export function ItemModal({
  isOpen,
  onClose,
  initialData,
  categories,
  onSave,
  texts,
  ownerLanguage = 'en',
  onTranslate,
  onGenerateDescription,
  onGenerateAI
}: ItemModalProps) {
  const [activeTab, setActiveTab] = useState("step1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations('owner.menu.itemModal');
  // Set sensible defaults for hidden fields
  const form = useForm<StreamlinedMenuItemFormData>({
    resolver: zodResolver(streamlinedMenuItemSchema),
    defaultValues: {
      name_en: '',
      name_ja: '',
      name_vi: '',
      description_en: '',
      description_ja: '',
      description_vi: '',
      price: 0,
      image_url: '',
      category_id: categories[0]?.id || '',
      available: true,
      weekday_visibility: [1, 2, 3, 4, 5, 6, 7],
      stock_level: 20,
      toppings: [],
      sizes: [],
      tags: [],
      position: 0,
      imageFile: null,
    },
  });

  // Reset form when initialData or modal state changes
  useEffect(() => {
    if (isOpen) {
      const formData = {
        id: initialData?.id,
        name_en: initialData?.name_en || '',
        name_ja: initialData?.name_ja || '',
        name_vi: initialData?.name_vi || '',
        description_en: initialData?.description_en || '',
        description_ja: initialData?.description_ja || '',
        description_vi: initialData?.description_vi || '',
        price: initialData?.price || 0,
        image_url: initialData?.image_url || '',
        category_id: initialData?.category_id || (categories[0]?.id || ''),
        available: initialData?.available ?? true,
        weekday_visibility: initialData?.weekday_visibility || [1, 2, 3, 4, 5, 6, 7],
        stock_level: initialData?.stock_level || 20,
        toppings: initialData?.toppings || [],
        sizes: initialData?.menu_item_sizes || [],
        tags: initialData?.tags || [],
        position: initialData?.position || 0,
        imageFile: null,
      };
      form.reset(formData);
    }
  }, [isOpen, initialData, categories, form]);

  const onSubmit = async (data: StreamlinedMenuItemFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data, initialData?.id);
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Track completion status for each tab
  const watchedValues = form.watch();
  const basicInfoComplete = !!(watchedValues.name_en && watchedValues.price > 0);
  const step2Complete = !!(
    watchedValues.stock_level ||
    (watchedValues.sizes?.length ?? 0) > 0 ||
    (watchedValues.toppings?.length ?? 0) > 0
  );
  const tabs = ["step1", "step2", "step3"];
  const currentTabIndex = tabs.indexOf(activeTab);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="!bottom-0 !left-0 !right-0 !top-auto !flex h-[calc(100dvh-12px)] !max-h-[calc(100dvh-12px)] w-full !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden rounded-b-none rounded-t-2xl border-x-0 border-b-0 border-[#ead9c6] bg-[#fffaf4] p-0 text-[#2f2117] shadow-[0_-24px_80px_rgba(58,37,22,0.24)] dark:border-white/10 dark:bg-[#211610] dark:text-[#f8eedf] sm:!bottom-auto sm:!left-1/2 sm:!right-auto sm:!top-1/2 sm:h-auto sm:!max-h-[calc(100vh-48px)] sm:!max-w-2xl sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-2xl sm:border">
        <DialogHeader className="flex-none border-b border-[#ead9c6] bg-[#fff6ea] px-4 py-3 pr-12 text-left dark:border-white/10 dark:bg-white/[0.04] sm:px-6 sm:py-4">
          <DialogTitle className="truncate text-base font-semibold sm:text-xl">
            {texts.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-3 grid h-auto grid-cols-3 gap-1 rounded-xl bg-[#f0dfca] p-1 dark:bg-black/20 sm:mx-6 sm:mt-4">
            <TabsTrigger value="step1" className="min-w-0 gap-1.5 rounded-md px-2 py-2 text-[11px] leading-tight sm:text-sm">
              <PenSquare className="h-4 w-4 shrink-0" />
              <span className="truncate sm:hidden">{t('tabs.basicShort')}</span>
              <span className="hidden truncate sm:inline">{t('tabs.basic')}</span>
              {basicInfoComplete && (
                <Badge variant="secondary" className="ml-auto hidden h-4 w-4 shrink-0 p-0 text-xs sm:inline-flex">
                  ✓
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="step2" className="min-w-0 gap-1.5 rounded-md px-2 py-2 text-[11px] leading-tight sm:text-sm">
              <Languages className="h-4 w-4 shrink-0" />
              <span className="truncate sm:hidden">{t('tabs.variantsShort')}</span>
              <span className="hidden truncate sm:inline">{t('tabs.variants')}</span>
              {step2Complete && (
                <Badge variant="secondary" className="ml-auto hidden h-4 w-4 shrink-0 p-0 text-xs sm:inline-flex">
                  ✓
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="step3" className="min-w-0 gap-1.5 rounded-md px-2 py-2 text-[11px] leading-tight sm:text-sm">
              <Check className="h-4 w-4 shrink-0" />
              <span className="truncate sm:hidden">{t('tabs.advancedShort')}</span>
              <span className="hidden truncate sm:inline">{t('tabs.advanced')}</span>
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
              <TabsContent value="step1" className="mt-4 space-y-4 sm:mt-6">
                <BasicInfoTab
                  form={form}
                  ownerLanguage={ownerLanguage}
                  categories={categories}
                  showAiTools={false}
                  onTranslate={onTranslate}
                  onGenerateDescription={onGenerateDescription}
                  onGenerateAI={onGenerateAI}
                />
              </TabsContent>

              <TabsContent value="step2" className="mt-4 space-y-0 sm:mt-6">
                <VariantsOptionsTab
                  form={form}
                  ownerLanguage={ownerLanguage}
                  onTranslate={onTranslate}
                />
              </TabsContent>

              <TabsContent value="step3" className="mt-4 space-y-0 sm:mt-6">
                <AdvancedSettingsTab
                  form={form}
                />
              </TabsContent>
            </div>
          </Form>

          <div className="flex-none space-y-3 border-t border-[#ead9c6] bg-[#fff6ea]/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom,0px))] backdrop-blur dark:border-white/10 dark:bg-[#211610]/95 sm:flex sm:items-center sm:justify-between sm:space-y-0 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              {activeTab !== "step1" && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentTabIndex > 0) {
                      setActiveTab(tabs[currentTabIndex - 1]);
                    }
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm text-[#8a6248] transition-colors hover:bg-[#ead9c6] hover:text-[#2f2117] dark:text-[#d9bea4] dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('buttons.previous')}
                </button>
              )}
              {activeTab !== "step3" && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentTabIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentTabIndex + 1]);
                    }
                  }}
                  className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm text-[#8a6248] transition-colors hover:bg-[#ead9c6] hover:text-[#2f2117] dark:text-[#d9bea4] dark:hover:bg-white/10 dark:hover:text-white sm:ml-0"
                >
                  {t('buttons.next')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
              <button
                type="button"
                onClick={handleClose}
                className="min-h-11 rounded-lg border border-[#d8c2a8] bg-white/75 px-4 text-sm transition-colors hover:bg-[#f0dfca] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 sm:min-h-10"
              >
                {texts.cancelButton}
              </button>
              <button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="min-h-11 rounded-lg bg-[#2f2117] px-4 text-sm text-[#fff8ee] transition-colors hover:bg-[#4a3020] disabled:opacity-50 dark:bg-[#f5b76d] dark:text-[#23160e] dark:hover:bg-[#ffd08b] sm:min-h-10"
              >
                {isSubmitting ? t('saving') : texts.saveButton}
              </button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

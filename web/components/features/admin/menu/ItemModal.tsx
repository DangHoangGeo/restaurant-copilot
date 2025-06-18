'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import { Info, Package, Settings } from "lucide-react";
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { VariantsOptionsTab } from './tabs/VariantsOptionsTab';
import { AdvancedSettingsTab } from './tabs/AdvancedSettingsTab';
import type { MenuItem, MenuItemCategory } from '@/shared/types/menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
  onGenerateAI?: (itemName: string) => Promise<{
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
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isEditing = !!initialData?.id;

  // Track completion status for each tab
  const watchedValues = form.watch();
  const basicInfoComplete = !!(watchedValues.name_en && watchedValues.price > 0);
  const variantsComplete = (watchedValues.toppings?.length || 0) > 0 || (watchedValues.sizes?.length || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh] sm:max-h-[95vh] overflow-hidden p-0 gap-0 mx-auto">
        <DialogHeader className="py-4 sm:p-6 pb-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {texts.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full min-h-[500px]">
          <TabsList className="grid w-full grid-cols-3 mx-auto sm:mx-4 mt-0">
            <TabsTrigger value="basic" className="relative text-xs sm:text-sm flex items-center">
              <Info className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Basic Info</span>
              {basicInfoComplete && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 h-4 w-4 p-0 text-xs">
                  ✓
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="variants" className="text-xs sm:text-sm flex items-center">
              <Package className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Variants & Options</span>
              {variantsComplete && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 h-4 w-4 p-0 text-xs">
                  ✓
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs sm:text-sm flex items-center">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Advanced Settings</span>
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 max-h-[calc(90vh-200px)] sm:max-h-[calc(95vh-200px)]">
              <TabsContent value="basic" className="mt-6 space-y-0">
                <BasicInfoTab
                  form={form}
                  ownerLanguage={ownerLanguage}
                  onTranslate={onTranslate}
                  onGenerateDescription={onGenerateDescription}
                  onGenerateAI={onGenerateAI}
                />
              </TabsContent>

              <TabsContent value="variants" className="mt-6 space-y-0">
                <VariantsOptionsTab
                  form={form}
                  ownerLanguage={ownerLanguage}
                  onTranslate={onTranslate}
                />
              </TabsContent>

              <TabsContent value="advanced" className="mt-6 space-y-0">
                <AdvancedSettingsTab
                  form={form}
                  categories={categories}
                  isEditing={isEditing}
                />
              </TabsContent>
            </div>
          </Form>

          {/* Fixed footer with navigation and save buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 gap-3 sm:gap-0">
            <div className="flex gap-2 order-1 sm:order-1">
              {activeTab !== "basic" && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ["basic", "variants", "advanced"];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabs[currentIndex - 1]);
                    }
                  }}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Previous
                </button>
              )}
              {activeTab !== "advanced" && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ["basic", "variants", "advanced"];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentIndex + 1]);
                    }
                  }}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Next →
                </button>
              )}
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 sm:flex-none px-4 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              >
                {texts.cancelButton}
              </button>
              <button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : texts.saveButton}
              </button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
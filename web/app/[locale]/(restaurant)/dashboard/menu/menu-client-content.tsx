'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, SquarePen, MenuIcon, AlertTriangle } from 'lucide-react';
import { MenuSkeleton } from '@/components/ui/skeletons';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useRestaurantSettings } from "@/contexts/RestaurantContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getLocalizedText } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ItemModal } from '@/components/features/admin/menu/ItemModal';
import { Category } from '@/shared/types/menu';

// New mobile-friendly components
import { MenuStatsBar } from '@/components/features/admin/menu/MenuStatsBar';
import { MenuSearchFilter, FilterState, ViewMode } from '@/components/features/admin/menu/MenuSearchFilter';
import { MenuItemCard } from '@/components/features/admin/menu/MenuItemCard';

// import { Switch } from "@/components/ui/switch"; // For availability toggle if preferred

/*
interface LocalizedText {
  [key: string]: string | undefined;
  name_en?: string;
  name_ja?: string;
  name_vi?: string;
}*/

// Remove props interface - component will be self-contained
// interface MenuClientContentProps removed

// Zod Schemas for validation
const toppingSchema = z.object({
  id: z.string().optional(),
  name_en: z.string().min(1, "English name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  position: z.coerce.number().int().min(0),
});

const menuItemSizeSchema = z.object({
  id: z.string().optional(),
  size_key: z.string().min(1, "Size key is required (e.g., S, M, L)"),
  name_en: z.string().min(1, "English name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  position: z.coerce.number().int().min(0),
});

const getCategorySchema = (t: ReturnType<typeof useTranslations<'AdminMenu.validation'>>) => z.object({
  id: z.string().optional(),
  name_en: z.string().min(1, t('name_en_required')).max(50, t('name_en_max_length', { maxLength: 50 })),
  name_ja: z.string().max(50, t('name_ja_max_length', { maxLength: 50 })).optional().nullable(),
  name_vi: z.string().max(50, t('name_vi_max_length', { maxLength: 50 })).optional().nullable(),
  position: z.number({ required_error: t('position_required') }), // D&D handles this, but good for data integrity
  menu_items: z.array(z.any()).optional(), // Not directly edited in this form
});

const getMenuItemSchema = (t: ReturnType<typeof useTranslations<'AdminMenu.validation'>>) => z.object({
  id: z.string().optional(),
  category_id: z.string({ required_error: t('category_id_required') }),
  name_en: z.string().min(1, t('name_en_required')).max(100, t('name_en_max_length', { maxLength: 100 })),
  name_ja: z.string().max(100, t('name_ja_max_length', { maxLength: 100 })).optional().nullable(),
  name_vi: z.string().max(100, t('name_vi_max_length', { maxLength: 100 })).optional().nullable(),
  description_en: z.string().max(500, t('description_en_max_length', { maxLength: 500 })).optional().nullable(),
  description_ja: z.string().max(500, t('description_ja_max_length', { maxLength: 500 })).optional().nullable(),
  description_vi: z.string().max(500, t('description_vi_max_length', { maxLength: 500 })).optional().nullable(),
  price: z.number({ required_error: t('price_required') }).min(0, t('price_min', { min: 0 })),
  image_url: z.string().url(t('image_url_invalid')).optional().nullable(),
  available: z.boolean().optional(),
  weekday_visibility: z.array(z.number()).optional().nullable(),
  stock_level: z.number().min(0, t('stock_level_min', {min: 0})).optional().nullable(),
  position: z.number({ required_error: t('position_required') }),
  tags: z.array(z.string()).optional(),
  // For image file handling, not part of DB schema directly for menu_item
  imageFile: z.instanceof(File)
    .refine(file => file.size <= 0.5 * 1024 * 1024, t('imageFile.maxSize', { maxSize: 0.5 }))
    .optional().nullable(),
  // Add toppings and sizes to the schema
  toppings: z.array(toppingSchema).optional(),
  sizes: z.array(menuItemSizeSchema).optional(),
});

type CategoryFormData = z.infer<ReturnType<typeof getCategorySchema>>;
type MenuItemFormData = z.infer<ReturnType<typeof getMenuItemSchema>>;

// CategoryModal component
interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryForm: ReturnType<typeof useForm<CategoryFormData>>;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  isLoading: boolean;
  t: (key: string) => string;
  onTranslate?: (text: string, field: string, context: 'item' | 'topping' | 'category') => Promise<{ en: string; ja: string; vi: string }>;
  ownerLanguage?: 'en' | 'ja' | 'vi';
}

function CategoryModal({ isOpen, onClose, categoryForm, onSubmit, isLoading, t, onTranslate, ownerLanguage = 'en' }: CategoryModalProps) {
  const [isTranslating, setIsTranslating] = useState(false);

  // Helper function to handle translation
  const translateText = async (text: string, field: string) => {
    if (!onTranslate || !text.trim()) return;
    
    setIsTranslating(true);
    try {
      const translations = await onTranslate(text, field, 'category');
      
      // Auto-fill all language fields with translations
      categoryForm.setValue('name_en', translations.en);
      categoryForm.setValue('name_ja', translations.ja);
      categoryForm.setValue('name_vi', translations.vi);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => { 
      if (!isOpen) {
        categoryForm.reset(); 
        onClose();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoryForm.getValues("id") ? t('edit_category') : t('add_category')}</DialogTitle>
        </DialogHeader>
        <Form {...categoryForm}>
          <form onSubmit={categoryForm.handleSubmit(onSubmit)} className="space-y-4">
            {/* Primary language field based on owner's language */}
            {ownerLanguage === 'en' && (
              <FormField
                control={categoryForm.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('category.name_en')}*
                      {onTranslate && field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 px-2 text-xs"
                          onClick={() => translateText(field.value || '', 'name')}
                          disabled={isTranslating || !field.value}
                        >
                          {isTranslating ? '...' : '🌐'}
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {ownerLanguage === 'ja' && (
              <FormField
                control={categoryForm.control}
                name="name_ja"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('category.name_ja')}*
                      {onTranslate && field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 px-2 text-xs"
                          onClick={() => translateText(field.value || '', 'name')}
                          disabled={isTranslating || !field.value}
                        >
                          {isTranslating ? '...' : '🌐'}
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {ownerLanguage === 'vi' && (
              <FormField
                control={categoryForm.control}
                name="name_vi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('category.name_vi')}*
                      {onTranslate && field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 px-2 text-xs"
                          onClick={() => translateText(field.value || '', 'name')}
                          disabled={isTranslating || !field.value}
                        >
                          {isTranslating ? '...' : '🌐'}
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Auto-generated translation fields (non-primary languages) */}
            {onTranslate && (
              <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('category.auto_translations_label')}
                </p>
                
                {ownerLanguage !== 'en' && (
                  <FormField
                    control={categoryForm.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('category.name_en')}</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8 text-sm" placeholder={t('category.auto_translate_name_en_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                
                {ownerLanguage !== 'ja' && (
                  <FormField
                    control={categoryForm.control}
                    name="name_ja"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('category.name_ja')}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} className="h-8 text-sm" placeholder={t('category.auto_translate_name_ja_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                
                {ownerLanguage !== 'vi' && (
                  <FormField
                    control={categoryForm.control}
                    name="name_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('category.name_vi')}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} className="h-8 text-sm" placeholder={t('category.auto_translate_name_vi_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
            
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('form_hint')}</p>
            <DialogFooter className="mt-6">
              <Button type="button" variant="secondary" onClick={() => { 
                categoryForm.reset(); 
                onClose(); 
              }}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="default" disabled={isLoading}>
                {isLoading ? t('buttons.saving') : t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export function MenuClientContent() {
  const t = useTranslations('owner.menu');
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('owner.menu.validation');
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const categorySchema = getCategorySchema(tValidation);
  const menuItemSchema = getMenuItemSchema(tValidation);

  const [menuData, setMenuData] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New mobile-friendly state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    categoryId: null,
    availability: 'all',
    stockStatus: 'all'
  });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Delete protection state
  const [deleteProtectionDialog, setDeleteProtectionDialog] = useState<{
    isOpen: boolean;
    type: 'category' | 'item';
    id: string;
    name: string;
    hasOrders: boolean;
  } | null>(null);
  const [checkingOrders, setCheckingOrders] = useState(false);

  const { restaurantSettings: restaurant } = useRestaurantSettings();
  const supabase = createClient();

  // Get owner's preferred language from locale
  const ownerLanguage = (locale === 'ja' ? 'ja' : locale === 'vi' ? 'vi' : 'en') as 'en' | 'ja' | 'vi';

  // Helper function to check if item/category has existing orders
  const checkForExistingOrders = async (type: 'category' | 'item', id: string): Promise<boolean> => {
    try {
      const endpoint = type === 'category' 
        ? `/api/v1/owner/categories/${id}/orders-check`
        : `/api/v1/owner/menu/menu-items/${id}/orders-check`;
      
      const response = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        // If endpoint doesn't exist, assume no orders (backward compatibility)
        return false;
      }

      const { hasOrders } = await response.json();
      return hasOrders;
    } catch (error) {
      console.error('Error checking for existing orders:', error);
      // If we can't check, assume no orders to allow deletion
      return false;
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setIsInitialLoading(true);
        setError(null);
        
        const response = await fetch('/api/v1/owner/categories', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch categories');
        }

        const { categories } = await response.json();
        setMenuData(categories || []);
      } catch (error) {
        console.error('Error loading menu data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load menu data');
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadMenuData();
  }, []);

  // Reload data after mutations
  const reloadData = async () => {
    try {
      const response = await fetch('/api/v1/owner/categories', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const { categories } = await response.json();
        setMenuData(categories || []);
      }
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  // Filter and process menu data
  const filteredMenuData = useMemo(() => {
    let filtered = [...menuData];

    // Filter by category if specified
    if (filters.categoryId) {
      filtered = filtered.filter(cat => cat.id === filters.categoryId);
    }

    // Apply filters to menu items within categories
    return filtered.map(category => ({
      ...category,
      menu_items: category.menu_items.filter(item => {
        // Search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const itemName = getLocalizedText({
            name_en: item.name_en,
            name_ja: item.name_ja,
            name_vi: item.name_vi
          }, locale).toLowerCase();
          
          if (!itemName.includes(searchLower)) {
            return false;
          }
        }

        // Availability filter
        if (filters.availability === 'available' && !item.available) return false;
        if (filters.availability === 'unavailable' && item.available) return false;

        // Stock status filter
        if (filters.stockStatus === 'low_stock' && (item.stock_level === undefined || item.stock_level >= 10)) return false;
        if (filters.stockStatus === 'in_stock' && (item.stock_level !== undefined && item.stock_level < 10)) return false;

        return true;
      })
    })).filter(category => 
      // Only show categories that have items after filtering (unless showing all categories for structure)
      !filters.searchTerm || category.menu_items.length > 0
    );
  }, [menuData, filters, locale]);

  // Callback for handling filter changes
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // Callback for handling view mode changes
  const handleViewModeChange = useCallback((newViewMode: ViewMode) => {
    setViewMode(newViewMode);
  }, []);

  // Translation function
  const handleTranslate = async (text: string, field: string, context: 'item' | 'topping' | 'category') => {
    try {
      const response = await fetch('/api/v1/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, field, context }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const translations = await response.json();
      return translations;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };
  // Generate Description function
  const handleGenerateDescription = async (text: string, initialData: string) => {
    try {
      const response = await fetch('/api/v1/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemName: text, initialData: initialData, language: ownerLanguage }),
      });

      if (!response.ok) {
        throw new Error('Description generation failed');
      }

      const descriptions = await response.json();
      return descriptions;
    } catch (error) {
      console.error('Description generation error:', error);
      throw error;
    }
  };

  // Combined AI generation function for names, descriptions, and tags
  const handleGenerateAI = async (itemName: string, existingDescription: string) => {
    try {
      const response = await fetch('/api/v1/ai/generate-menu-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          itemName, 
          existingDescription,
          language: ownerLanguage || 'en',
          restaurantName: restaurant?.name,
          restaurantDescription: ownerLanguage === 'en' ? restaurant?.description_en || '' : ownerLanguage === 'ja' ? restaurant?.description_ja || '' : restaurant?.description_vi || '',
        }),
      });

      if (!response.ok) {
        throw new Error('AI generation failed');
      }

      const result = await response.json();
      return {
        name_en: ownerLanguage === "en" ? itemName || result.name_en : result.name_en || '',
        name_ja: ownerLanguage === "ja" ? itemName || result.name_ja : result.name_ja || '',
        name_vi: ownerLanguage === "vi" ? itemName || result.name_vi : result.name_vi || '',
        description_en: result.description_en || '',
        description_ja: result.description_ja || '',
        description_vi: result.description_vi || '',
        tags: result.tags || []
      };
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback to individual generation if combined endpoint fails
      try {
        const [translations, descriptions] = await Promise.all([
          handleTranslate(itemName, 'name', 'item'),
          handleGenerateDescription(itemName, '')
        ]);
        
        return {
          name_en: translations.en || itemName,
          name_ja: translations.ja || '',
          name_vi: translations.vi || '',
          description_en: descriptions.en || '',
          description_ja: descriptions.ja || '',
          description_vi: descriptions.vi || '',
          tags: [] // Basic tags fallback
        };
      } catch (fallbackError) {
        console.error('Fallback AI generation error:', fallbackError);
        throw error;
      }
    }
  };

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name_en: '', name_ja: '', name_vi: '', position: 0 },
  });

  const itemForm = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name_en: '', price: 0, available: true,
      weekday_visibility: [1, 2, 3, 4, 5, 6, 7], position: 0, stock_level: null,
      category_id: '', // Initialize category_id
      imageFile: undefined,
      toppings: [], // Initialize toppings array
      sizes: [], // Initialize sizes array
    },
  });

  useEffect(() => {
    // Remove this effect since we're now loading data on mount
  }, []);

  const handleOpenCategoryModal = (categoryData: CategoryFormData | null = null) => {
    if (categoryData) {
      categoryForm.reset(categoryData);
    } else {
      categoryForm.reset({ name_en: '', name_ja: '', name_vi: '', position: menuData.length });
    }
    setIsCategoryModalOpen(true);
  };

  const handleOpenItemModal = (category: Category, itemData: Partial<MenuItemFormData> | null = null) => {
    if (itemData) {
      itemForm.reset({
        ...itemData,
        stock_level: itemData.stock_level ?? 10, // Default to 10 if not set
        category_id: category.id, // ensure category_id is set from the context
        weekday_visibility: itemData.weekday_visibility || [],
        imageFile: undefined, // Explicitly reset file
      });
    } else {
      itemForm.reset({
        name_en: '', name_ja: '', name_vi: '',
        description_en: '', description_ja: '', description_vi: '',
        price: 0, image_url: '', available: true,
        weekday_visibility: [1, 2, 3, 4, 5, 6, 7],
        stock_level: 10, // Use null for optional numbers not set
        tags: [], // Initialize tags array
        position: category.menu_items.length,
        category_id: category.id, // Set category_id for new item
        imageFile: undefined,
        toppings: [], // Initialize toppings array
        sizes: [], // Initialize sizes array
      });
    }
    setIsItemModalOpen(true);
  };

  const onCategorySubmit = async (data: CategoryFormData) => {
    setIsLoading(true);
    try {
      const method = data.id ? 'PUT' : 'POST';
      const url = data.id ? `/api/v1/owner/categories/${data.id}` : '/api/v1/owner/categories';
      
      // Ensure position is a number if not already
      const payload = { ...data };
      if (typeof payload.position !== 'number') {
         payload.position = menuData.findIndex(cat => cat.id === data.id);
         if (payload.position === -1 || !data.id) payload.position = menuData.length;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save category');
      }

      toast.success(data.id ? t('category.update_success') : t('category.create_success'));
      setIsCategoryModalOpen(false);
      await reloadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(t('category.save_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = menuData.find(cat => cat.id === categoryId);
    if (!category) return;

    setCheckingOrders(true);
    try {
      const hasOrders = await checkForExistingOrders('category', categoryId);
      
      if (hasOrders) {
        setDeleteProtectionDialog({
          isOpen: true,
          type: 'category',
          id: categoryId,
          name: getLocalizedText({
            name_en: category.name_en,
            name_ja: category.name_ja,
            name_vi: category.name_vi
          }, locale),
          hasOrders: true
        });
        return;
      }

      // No orders found, proceed with deletion
      await performCategoryDeletion(categoryId);
    } catch (error) {
      console.error('Error checking orders for category:', error);
      toast.error(t('category.delete_error'));
    } finally {
      setCheckingOrders(false);
    }
  };

  const performCategoryDeletion = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/owner/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('category.delete_error_fallback'));
      }
      toast.success(t('category.delete_success'));
      await reloadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error instanceof Error ? error.message : t('category.delete_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const onItemSubmit = async (data: MenuItemFormData) => {
    if (!data.category_id) { 
      toast.error(tValidation('category_id_required')); 
      return;
    }
    setIsLoading(true);
    try {
      let imageUrl = data.image_url; 

      const fileToUpload = data.imageFile; 

      if (fileToUpload) {
        const sessionResponse = await fetch('/api/v1/auth/session');
        const sessionData = await sessionResponse.json();
        if (!sessionData.authenticated || !sessionData.user?.restaurantId) {
          throw new Error('User not authenticated or missing restaurant ID');
        }
        const fileName = `${Date.now()}-${fileToUpload.name}`;
        const filePath = `restaurants/${sessionData.user.restaurantId}/menu_items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('restaurant-uploads')
          .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: false }); // Consider upsert true if replacing
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage.from('restaurant-uploads').getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }
      
      const method = data.id ? 'PUT' : 'POST';
      const url = data.id ? `/api/v1/owner/menu/menu-items/${data.id}` : '/api/v1/owner/menu/menu-items';

      // Exclude imageFile from DB payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imageFile, ...itemPayloadDb } = data;
      const finalPayload = {
        ...itemPayloadDb,
        image_url: imageUrl && imageUrl.trim() !== '' ? imageUrl : null,
      };

      // Ensure position is a number if not already or if it's a new item
      if (typeof finalPayload.position !== 'number' || !data.id) {
        const category = menuData.find(cat => cat.id === finalPayload.category_id);
        const currentPosition = category ? category.menu_items.findIndex(item => item.id === data.id) : -1;

        if (!data.id) { // New item
            finalPayload.position = category ? category.menu_items.length : 0;
        } else if (currentPosition !== -1) { // Existing item, position not changed by DND yet
            finalPayload.position = currentPosition;
        } else { // Fallback for existing item if somehow position is not found
            finalPayload.position = category ? category.menu_items.length : 0;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save menu item');
      }

      toast.success(data.id ? t('item.update_success') : t('item.create_success'));
      setIsItemModalOpen(false);
      itemForm.reset(); 
      await reloadData();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error(error instanceof Error ? error.message : t('item.save_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAvailability = async (itemId: string, currentAvailability: boolean) => {
    try {
      const response = await fetch(`/api/v1/owner/menu/menu-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !currentAvailability }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update availability');
      }

      toast.success(t(!currentAvailability ? 'item.made_available' : 'item.made_unavailable'));
      await reloadData();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error(t('item.availability_update_error'));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Find the item to get its name for the dialog
    let itemName = 'Unknown Item';
    for (const category of menuData) {
      const item = category.menu_items.find(item => item.id === itemId);
      if (item) {
        itemName = getLocalizedText({
          name_en: item.name_en,
          name_ja: item.name_ja,
          name_vi: item.name_vi
        }, locale);
        break;
      }
    }

    setCheckingOrders(true);
    try {
      const hasOrders = await checkForExistingOrders('item', itemId);
      
      if (hasOrders) {
        setDeleteProtectionDialog({
          isOpen: true,
          type: 'item',
          id: itemId,
          name: itemName,
          hasOrders: true
        });
        return;
      }

      // No orders found, proceed with deletion
      await performItemDeletion(itemId);
    } catch (error) {
      console.error('Error checking orders for item:', error);
      toast.error(t('item.delete_error'));
    } finally {
      setCheckingOrders(false);
    }
  };

  const performItemDeletion = async (itemId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/owner/menu/menu-items/${itemId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete menu item');
      }
      toast.success(t('item.delete_success'));
      await reloadData();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error(t('item.delete_error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Delete protection dialog handlers
  const handleMakeUnavailable = async () => {
    if (!deleteProtectionDialog) return;
    
    if (deleteProtectionDialog.type === 'item') {
      try {
        const response = await fetch(`/api/v1/owner/menu/menu-items/${deleteProtectionDialog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ available: false }),
        });

        if (!response.ok) {
          throw new Error('Failed to update availability');
        }

        toast.success(t('item.made_unavailable'));
        await reloadData();
      } catch (error) {
        console.error('Error making item unavailable:', error);
        toast.error(t('item.availability_update_error'));
      }
    } else if (deleteProtectionDialog.type === 'category') {
      // Make all items in category unavailable
      try {
        const category = menuData.find(cat => cat.id === deleteProtectionDialog.id);
        if (category) {
          const updatePromises = category.menu_items.map(item =>
            fetch(`/api/v1/owner/menu/menu-items/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ available: false }),
            })
          );
          
          await Promise.all(updatePromises);
          toast.success(t('category.items_made_unavailable'));
          await reloadData();
        }
      } catch (error) {
        console.error('Error making category items unavailable:', error);
        toast.error(t('category.availability_update_error'));
      }
    }
    
    setDeleteProtectionDialog(null);
  };

  const handleForceDelete = async () => {
    if (!deleteProtectionDialog) return;
    
    if (deleteProtectionDialog.type === 'item') {
      await performItemDeletion(deleteProtectionDialog.id);
    } else if (deleteProtectionDialog.type === 'category') {
      await performCategoryDeletion(deleteProtectionDialog.id);
    }
    
    setDeleteProtectionDialog(null);
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;

    if (type === 'CATEGORY') {
      const reorderedCategories = Array.from(menuData);
      const [movedCategory] = reorderedCategories.splice(source.index, 1);
      reorderedCategories.splice(destination.index, 0, movedCategory);

      setMenuData(reorderedCategories.map((cat, index) => ({ ...cat, position: index })));

      // API calls to update category positions
      setIsLoading(true);
      try {
        for (let i = 0; i < reorderedCategories.length; i++) {
          const category = reorderedCategories[i];
          if (category.position !== i) { // Only update if position actually changed
            await fetch(`/api/v1/owner/categories/${category.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ position: i }),
            });
          }
        }
        toast.success(t('category.reorder_success'));
        await reloadData(); // Refresh to confirm, though local state is updated
      } catch (error) {
        console.error('Error reordering categories:', error);
        toast.error(t('category.reorder_error')); // Add this translation key
        // Potentially revert state or rely on reloadData()
        setMenuData([]); // Revert to empty on error
      } finally {
        setIsLoading(false);
      }
    } else if (type === 'MENU_ITEM') {
      const sourceCategoryIndex = menuData.findIndex(cat => cat.id === source.droppableId);
      const destCategoryIndex = menuData.findIndex(cat => cat.id === destination.droppableId);
      if (sourceCategoryIndex === -1 || destCategoryIndex === -1) return;

      const newMenuData = Array.from(menuData);
      const sourceCategory = { ...newMenuData[sourceCategoryIndex] };
      const destCategory = sourceCategoryIndex === destCategoryIndex ? sourceCategory : { ...newMenuData[destCategoryIndex] };

      const sourceItems = Array.from(sourceCategory.menu_items);
      const [movedItem] = sourceItems.splice(source.index, 1);

      sourceCategory.menu_items = sourceItems.map((item, index) => ({ ...item, position: index }));
      newMenuData[sourceCategoryIndex] = sourceCategory;


      const destItems = sourceCategoryIndex === destCategoryIndex ? sourceItems : Array.from(destCategory.menu_items); // Changed to const
      destItems.splice(destination.index, 0, { ...movedItem, id: destCategory.id }); // Ensure category_id is updated

      destCategory.menu_items = destItems.map((item, index) => ({ ...item, position: index }));
      newMenuData[destCategoryIndex] = destCategory;

      setMenuData(newMenuData);

      // API calls to update item positions and potentially category_id
      setIsLoading(true);
      try {
        const itemToUpdate = destCategory.menu_items[destination.index];
         await fetch(`/api/v1/owner/menu/menu-items/${itemToUpdate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              position: destination.index,
              category_id: destCategory.id // Update category_id if moved to a different category
            }),
          });

        // If items were moved within the same category, or from another, their old positions need re-eval too
        // This simplified version only updates the moved item. A full solution might re-update all items in affected categories.
        // For now, we rely on router.refresh() to get fully consistent positions from backend if needed.

        toast.success(t('item.reorder_success'));
        await reloadData();
      } catch (error) {
        console.error('Error reordering menu item:', error);
        toast.error(t('item.reorder_error')); // Add this translation key
        setMenuData([]); // Revert on error
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (error) {
    return (
      <>
        <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-300 rounded-md">
          {error}
        </div>
      </>
    );
  }
  
  // Show loading skeleton during initial load
  if (isInitialLoading) {
    return <MenuSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <>
        <header className="mb-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
            {t("title")}
          </h1>
        </header>
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tCommon("errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </>
    );
  }

  // TODO: Add a proper loading state UI, perhaps a spinner overlay or skeleton loaders.
  if (isLoading && menuData.length === 0) {
      return (
        <>
          <div className="flex items-center justify-center h-64">
            {/* TODO: Replace with a proper spinner component from shadcn/ui if available, or a custom one */}
            <MenuIcon className="h-12 w-12 text-slate-400 animate-spin" />
          </div>
        </>
      );
  }

  if (!error && menuData.length === 0) {
    return (
      <>
        <header className="mb-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
            {t("title")}
          </h1>
        </header>
        <div className="text-center py-12">
          <MenuIcon className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-xl font-semibold text-slate-800 dark:text-slate-100">{t('empty_state.no_categories_title')}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('empty_state.no_categories_description')}</p>
          <div className="mt-6">
            <Button onClick={() => handleOpenCategoryModal()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('add_category')}
            </Button>
          </div>
        </div>
        
        {/* Category Modal - Always render for empty state */}
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categoryForm={categoryForm}
          onSubmit={onCategorySubmit}
          isLoading={isLoading}
          t={t}
          onTranslate={handleTranslate}
          ownerLanguage={ownerLanguage}
        />
      </>
    );
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
      </header>

      {/* Mobile-Friendly Stats Bar */}
      <MenuStatsBar categories={menuData} isLoading={isInitialLoading} locale={locale} />

      {/* Search and Filter Bar */}
      <MenuSearchFilter
        categories={menuData}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onRefresh={reloadData}
        isLoading={isLoading}
        locale={locale}
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              {t('title')}
            </h2>
            <Button onClick={() => handleOpenCategoryModal()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('add_category')}
            </Button>
          </div>

        <Droppable droppableId="all-categories" type="CATEGORY">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-6"
            >
              {filteredMenuData.map((category, index) => (
                <Draggable key={category.id} draggableId={category.id} index={index}>
                  {(providedDraggable) => (
                    <Card
                      ref={providedDraggable.innerRef}
                      {...providedDraggable.draggableProps}
                      className="mb-6"
                    >
                      <div
                        {...providedDraggable.dragHandleProps}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 gap-2 p-4 cursor-grab"
                      >
                        <div className="flex items-center">
                          <MenuIcon className="h-5 w-5 mr-2 text-slate-400" />
                          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                            {getLocalizedText({ name_en: category.name_en, name_ja: category.name_ja, name_vi: category.name_vi }, locale)}
                          </h3>
                        </div>
                        <div className="flex space-x-1 sm:space-x-2 self-start sm:self-center">
                          <Button size="sm" variant="secondary" onClick={() => handleOpenItemModal(category, null)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('add_item')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleOpenCategoryModal(category as CategoryFormData)}>
                            <SquarePen className="mr-2 h-4 w-4" /> {t('edit')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(category.id)} className="text-red-500 hover:text-red-600" disabled={isLoading || checkingOrders}>
                            <Trash2 className="mr-2 h-4 w-4" /> {checkingOrders ? t('delete_protection.checking_orders') : t('delete')}
                          </Button>
                        </div>
                      </div>
                      <Droppable droppableId={category.id} type="MENU_ITEM">
                        {(providedDroppableItems) => (
                          <CardContent
                            ref={providedDroppableItems.innerRef}
                            {...providedDroppableItems.droppableProps}
                          >
                            {category.menu_items.length > 0 ? (
                              viewMode === 'table' ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                                          {t('table_headers.image')}
                                        </th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                                          {t('table_headers.item_details')}
                                        </th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                                          {t('table_headers.actions')}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {category.menu_items.map((item, itemIndex) => (
                                        <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                          {(providedDraggableItem) => (
                                            <MenuItemCard
                                              item={item}
                                              locale={locale}
                                              viewMode={viewMode}
                                              isLoading={isLoading}
                                              onEdit={() => handleOpenItemModal(category, item as MenuItemFormData)}
                                              onDelete={() => handleDeleteItem(item.id)}
                                              onToggleAvailability={() => handleToggleAvailability(item.id, item.available)}
                                              t={t}
                                              dragRef={providedDraggableItem.innerRef}
                                              dragHandleProps={providedDraggableItem.dragHandleProps}
                                              draggableProps={providedDraggableItem.draggableProps}
                                            />
                                          )}
                                        </Draggable>
                                      ))}
                                    </tbody>
                                  </table>
                                  {providedDroppableItems.placeholder}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {category.menu_items.map((item, itemIndex) => (
                                    <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                      {(providedDraggableItem) => (
                                        <div
                                          ref={providedDraggableItem.innerRef}
                                          {...providedDraggableItem.draggableProps}
                                          {...providedDraggableItem.dragHandleProps}
                                          className="cursor-grab"
                                        >
                                          <MenuItemCard
                                            item={item}
                                            locale={locale}
                                            viewMode={viewMode}
                                            isLoading={isLoading}
                                            onEdit={() => handleOpenItemModal(category, item as MenuItemFormData)}
                                            onDelete={() => handleDeleteItem(item.id)}
                                            onToggleAvailability={() => handleToggleAvailability(item.id, item.available)}
                                            t={t}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {providedDroppableItems.placeholder}
                                </div>
                              )
                            ) : (
                              <div className="text-center py-8">
                                <MenuIcon className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                                <h3 className="mt-2 text-md font-semibold text-slate-600 dark:text-slate-300">{t('empty_state.no_items_title')}</h3>
                                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{t('empty_state.no_items_description')}</p>
                                <div className="mt-4">
                                  <Button size="sm" variant="outline" onClick={() => handleOpenItemModal(category, null)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    {t('add_item')}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Droppable>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryForm={categoryForm}
        onSubmit={onCategorySubmit}
        isLoading={isLoading}
        t={t}
        onTranslate={handleTranslate}
        ownerLanguage={ownerLanguage}
      />

      {/* Item Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        initialData={{
          id: itemForm.getValues().id || '',
          name_en: itemForm.getValues().name_en || '',
          name_ja: itemForm.getValues().name_ja || '',
          name_vi: itemForm.getValues().name_vi || '',
          description_en: itemForm.getValues().description_en || '',
          description_ja: itemForm.getValues().description_ja || '',
          description_vi: itemForm.getValues().description_vi || '',
          price: itemForm.getValues().price || 0,
          tags: itemForm.getValues().tags || [],
          position: itemForm.getValues().position || 0,
          image_url: itemForm.getValues().image_url || '',
          available: itemForm.getValues().available ?? true,
          category_id: itemForm.getValues().category_id || '',
          weekday_visibility: itemForm.getValues().weekday_visibility || [],
          stock_level: itemForm.getValues().stock_level ?? 20,
          toppings: itemForm.getValues().toppings || [],
          menu_item_sizes: itemForm.getValues().sizes || [],
        }}
        categories={menuData.map(cat => ({
          id: cat.id,
          name: getLocalizedText({ 
            name_en: cat.name_en, 
            name_ja: cat.name_ja, 
            name_vi: cat.name_vi 
          }, locale),
          name_en: cat.name_en,
          name_ja: cat.name_ja,
          name_vi: cat.name_vi,
          position: cat.position,
          restaurant_id: cat.restaurant_id,
        }))}
        ownerLanguage={ownerLanguage}
        onTranslate={handleTranslate}
        onGenerateDescription={handleGenerateDescription}
        onGenerateAI={handleGenerateAI}
        onSave={async (data, menuItemId) => {
          // Transform ItemModal data to match onItemSubmit expected format
          const transformedData: MenuItemFormData = {
            ...data,
            id: menuItemId,
            weekday_visibility: data.weekday_visibility,
            position: itemForm.getValues().position || 0,
            category_id: data.category_id,
            toppings: data.toppings,
            sizes: data.sizes,
          };
          await onItemSubmit(transformedData);
        }}
        texts={{
          saveButton: isLoading ? t('buttons.saving') : t('save'),
          cancelButton: t('cancel'),
          title: itemForm.getValues("id") ? t('edit_item') : t('add_item'),
          successMessage: itemForm.getValues("id") ? t('item.update_success') : t('item.create_success'),
          errorMessage: t('item.save_error'),
        }}
      />
    </DragDropContext>

      {/* Delete Protection Dialog */}
      {deleteProtectionDialog && (
        <Dialog open={deleteProtectionDialog.isOpen} onOpenChange={(open) => !open && setDeleteProtectionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t(`delete_protection.${deleteProtectionDialog.type}_has_orders_title`)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(`delete_protection.${deleteProtectionDialog.type}_has_orders_description`)}
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {deleteProtectionDialog.type === 'category' ? t('category.name') : t('item.name')}: {deleteProtectionDialog.name}
                </p>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="secondary" 
                onClick={() => setDeleteProtectionDialog(null)}
                className="w-full sm:w-auto"
              >
                {t('delete_protection.cancel')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleMakeUnavailable}
                className="w-full sm:w-auto"
              >
                {t('delete_protection.make_unavailable')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleForceDelete}
                className="w-full sm:w-auto"
              >
                {t('delete_protection.force_delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

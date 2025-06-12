'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, SquarePen, MenuIcon, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { StarRating } from '@/components/ui/star-rating';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getLocalizedText } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MenuItemForm } from '@/components/features/admin/menu/MenuItemForm';
import Image from 'next/image';
// import { Switch } from "@/components/ui/switch"; // For availability toggle if preferred

/*
interface LocalizedText {
  [key: string]: string | undefined;
  name_en?: string;
  name_ja?: string;
  name_vi?: string;
}*/

interface MenuItem {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  description_en: string;
  description_ja: string;
  description_vi: string;
  price: number;
  image_url?: string;
  available: boolean;
  weekday_visibility: number[];
  stock_level?: number;
  position: number;
  averageRating?: number;
  reviewCount?: number;
  category_id?: string;
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
}

interface Category {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  position: number;
  menu_items: MenuItem[];
}

interface MenuClientContentProps {
  initialData: Category[];
  error: string | null;
}

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
  tags: z.array(z.string()).optional(), // Tags are optional, not part of DB schema directly
  // For image file handling, not part of DB schema directly for menu_item
  imageFile: z.instanceof(File).refine(file => file.size <= 5 * 1024 * 1024, t('logoFile.maxSize', { maxSize: 5 })).optional().nullable(),
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
}

function CategoryModal({ isOpen, onClose, categoryForm, onSubmit, isLoading, t }: CategoryModalProps) {
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
            <FormField
              control={categoryForm.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('category.name_en')}*</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={categoryForm.control}
              name="name_ja"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('category.name_ja')}</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={categoryForm.control}
              name="name_vi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('category.name_vi')}</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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


export function MenuClientContent({ initialData, error }: MenuClientContentProps) {
  const t = useTranslations('AdminMenu');
  // const tCommon = useTranslations('Common'); // Removed
  const tValidation = useTranslations('AdminMenu.validation');
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const categorySchema = getCategorySchema(tValidation);
  const menuItemSchema = getMenuItemSchema(tValidation);

  const [menuData, setMenuData] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  // const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null); // Removed
  // const [editingItem, setEditingItem] = useState<Partial<MenuItemFormData> | null>(null); // Removed
  // const [selectedCategoryIdForItem, setSelectedCategoryIdForItem] = useState<string | null>(null); // Removed
  // const [imageFile, setImageFile] = useState<File | null>(null); // Removed
  // const [imagePreview, setImagePreview] = useState<string | null>(null); // Not used with MenuItemForm
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Get owner's preferred language from locale
  const ownerLanguage = (locale === 'ja' ? 'ja' : locale === 'vi' ? 'vi' : 'en') as 'en' | 'ja' | 'vi';

  // Translation function
  const handleTranslate = async (text: string, field: string, context: 'item' | 'topping') => {
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
  }

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
    setMenuData(initialData || []);
  }, [initialData]);

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
      const url = data.id ? `/api/v1/categories/${data.id}` : '/api/v1/categories';
      
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
      router.refresh();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(t('category.save_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('category.delete_error_fallback'));
      }
      toast.success(t('category.delete_success'));
      router.refresh();
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
      const url = data.id ? `/api/v1/menu-items/${data.id}` : '/api/v1/menu-items';

      //const { imageFile, ...itemPayloadDb } = data; // Exclude imageFile from DB payload
      const {...itemPayloadDb } = data;
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
      router.refresh();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error(error instanceof Error ? error.message : t('item.save_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/menu-items/${itemId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete menu item');
      }
      toast.success(t('item.delete_success'));
      router.refresh();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error(t('item.delete_error'));
    } finally {
      setIsLoading(false);
    }
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
            await fetch(`/api/v1/categories/${category.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ position: i }),
            });
          }
        }
        toast.success(t('category.reorder_success')); // Add this translation key
        router.refresh(); // Refresh to confirm, though local state is updated
      } catch (error) {
        console.error('Error reordering categories:', error);
        toast.error(t('category.reorder_error')); // Add this translation key
        // Potentially revert state or rely on router.refresh()
        setMenuData(initialData || []); // Revert to initial on error
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
         await fetch(`/api/v1/menu-items/${itemToUpdate.id}`, {
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

        toast.success(t('item.reorder_success')); // Add this translation key
        router.refresh();
      } catch (error) {
        console.error('Error reordering menu item:', error);
        toast.error(t('item.reorder_error')); // Add this translation key
        setMenuData(initialData || []); // Revert
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
        />
      </>
    );
  }

  return (
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
              {menuData.map((category, index) => (
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
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(category.id)} className="text-red-500 hover:text-red-600" disabled={isLoading}>
                            <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
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
                              <div className="space-y-3">
                                {category.menu_items.map((item, itemIndex) => (
                                  <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                    {(providedDraggableItem) => (
                                      <Card
                                        ref={providedDraggableItem.innerRef}
                                        {...providedDraggableItem.draggableProps}
                                        {...providedDraggableItem.dragHandleProps}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 hover:shadow-md transition-shadow relative cursor-grab"
                                      >
                                        {item.stock_level !== undefined && item.stock_level < 10 && FEATURE_FLAGS.lowStockAlerts && (
                                          <div className="absolute top-2 right-2 bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200 text-xs px-2 py-0.5 rounded-full flex items-center">
                                            <AlertTriangle size={12} className="mr-1" />
                                            {t('low_stock')} ({item.stock_level})
                                          </div>
                                        )}
                                        <div className="flex items-center mb-2 sm:mb-0 flex-grow">
                                          {item.image_url ? (
                                            <Image
                                              src={item.image_url}
                                              alt={getLocalizedText({ en: item.name_en, ja: item.name_ja, vi: item.name_vi }, locale)}
                                              className="w-20 h-16 object-cover rounded-md mr-4 flex-shrink-0"
                                              width={80}
                                              height={64}
                                            />
                                          ) : (
                                            <div className="w-20 h-16 rounded-md mr-4 flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                              <MenuIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                            </div>
                                          )}
                                          <div className="flex-grow">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                                              {getLocalizedText({ en: item.name_en, ja: item.name_ja, vi: item.name_vi }, locale)}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                              {t('currency_format', { value: item.price })}
                                            </p>
                                            <StarRating value={item.averageRating || 0} count={item.reviewCount || 0} size="sm" />
                                            <div className="mt-1 flex flex-wrap gap-1">
                                              {item.weekday_visibility.map(day => (
                                                <span key={day} className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                  {day && t(`weekdays_short.${day}_short`)}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex space-x-1 sm:space-x-2 mt-2 sm:mt-0 self-end sm:self-center flex-shrink-0">
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.available ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300'}`}>
                                            {item.available ? t('available') : t('unavailable')}
                                          </span>
                                          <Button size="sm" variant="ghost" onClick={() => handleOpenItemModal(category, item as MenuItemFormData)}>
                                            <SquarePen className="mr-2 h-4 w-4" /> {t('edit')}
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-600" disabled={isLoading}>
                                            <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                                          </Button>
                                        </div>
                                      </Card>
                                    )}
                                  </Draggable>
                                ))}
                                {providedDroppableItems.placeholder}
                              </div>
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
      />

      {/* Item Modal */}
      <Dialog open={isItemModalOpen} onOpenChange={(isOpen) => { 
        if (!isOpen) { 
          itemForm.reset(); 
        } 
        setIsItemModalOpen(isOpen); 
      }}>
        <DialogContent className="max-w-screen sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <MenuItemForm
            initialData={ {
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
              weekdayVisibility: itemForm.getValues().weekday_visibility || [],
              stock_level: itemForm.getValues().stock_level ?? 20,
              toppings: itemForm.getValues().toppings || [],
              menu_item_sizes: itemForm.getValues().sizes || [],
            } }
            categories={menuData.map(cat => ({
              id: cat.id,
              name: getLocalizedText({ 
                name_en: cat.name_en, 
                name_ja: cat.name_ja, 
                name_vi: cat.name_vi 
              }, locale),
            }))}
            ownerLanguage={ownerLanguage}
            onTranslate={handleTranslate}
            onGenerateDescription={handleGenerateDescription}
            onSave={async (data, menuItemId) => {
              // Transform MenuItemForm data to match onItemSubmit expected format
              const transformedData: MenuItemFormData = {
                ...data,
                id: menuItemId,
                weekday_visibility: data.weekdayVisibility,
                position: itemForm.getValues().position || 0,
                category_id: data.category_id,
                toppings: data.toppings,
                sizes: data.sizes,
              };
              await onItemSubmit(transformedData);
            }}
            onCancel={() => {
              itemForm.reset();
              setIsItemModalOpen(false);
            }}
            texts={{
              saveButton: isLoading ? t('buttons.saving') : t('save'),
              cancelButton: t('cancel'),
              title: itemForm.getValues("id") ? t('edit_item') : t('add_item'),
              successMessage: itemForm.getValues("id") ? t('item.update_success') : t('item.create_success'),
              errorMessage: t('item.save_error'),
            }}
          />
        </DialogContent>
      </Dialog>
    </DragDropContext>
  );
}

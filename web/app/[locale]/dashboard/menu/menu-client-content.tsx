'use client';

import { useState } from 'react';
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
import { WeekdaySelector } from '@/components/features/admin/menu/WeekdaySelector';
import { StarRating } from '@/components/ui/star-rating';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface LocalizedText {
  [key: string]: string | undefined;
  name_en?: string;
  name_ja?: string;
  name_vi?: string;
}

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
  weekday_visibility: string[];
  stock_level?: number;
  position: number;
  averageRating?: number;
  reviewCount?: number;
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
  initialData: Category[] | null;
  error: string | null;
}

export function MenuClientContent({ initialData, error }: MenuClientContentProps) {
  const t = useTranslations('AdminMenu');
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  
  const [menuData, setMenuData] = useState(initialData || []);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [selectedCategoryIdForItem, setSelectedCategoryIdForItem] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const getLocalizedText = (obj: { [key: string]: string | undefined }, locale: string) => {
    return obj[`name_${locale}`] || obj[`name_en`] || '';
  };

  const handleOpenCategoryModal = (category: Category | null = null) => {
    setEditingCategory(
      category 
        ? { 
            ...category,
            name_en: category.name_en,
            name_ja: category.name_ja,
            name_vi: category.name_vi 
          } 
        : { 
            name_en: '', 
            name_ja: '', 
            name_vi: '', 
            position: menuData.length + 1 
          }
    );
    setIsCategoryModalOpen(true);
  };

  const handleOpenItemModal = (category: Category, item: MenuItem | null = null) => {
    setSelectedCategoryIdForItem(category.id);
    setEditingItem(
      item 
        ? { 
            ...item,
            name_en: item.name_en,
            name_ja: item.name_ja,
            name_vi: item.name_vi,
            description_en: item.description_en,
            description_ja: item.description_ja,
            description_vi: item.description_vi,
            weekday_visibility: item.weekday_visibility || [] 
          } 
        : { 
            name_en: '', 
            name_ja: '', 
            name_vi: '', 
            description_en: '', 
            description_ja: '', 
            description_vi: '', 
            price: 0, 
            image_url: '', 
            available: true, 
            weekday_visibility: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 
            stock_level: 100 
          }
    );
    setIsItemModalOpen(true);
  };

  const handleSaveCategory = async () => {
	console.log('Saving category:', editingCategory);
    if (!editingCategory) return;
    
    try {
      if (editingCategory.id) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name_en: editingCategory.name_en,
            name_ja: editingCategory.name_ja,
            name_vi: editingCategory.name_vi,
            position: editingCategory.position
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success(t('category.update_success'));
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert({
            name_en: editingCategory.name_en,
            name_ja: editingCategory.name_ja,
            name_vi: editingCategory.name_vi,
            position: editingCategory.position
          });

        if (error) throw error;
        toast.success(t('category.create_success'));
      }

      setIsCategoryModalOpen(false);
      router.refresh(); // Refresh the server component to get updated data
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(t('category.save_error'));
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      toast.success(t('category.delete_success'));
      router.refresh();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(t('category.delete_error'));
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem || !selectedCategoryIdForItem) return;
    
    try {
      const itemData = {
        category_id: selectedCategoryIdForItem,
        name_en: editingItem.name_en,
        name_ja: editingItem.name_ja,
        name_vi: editingItem.name_vi,
        description_en: editingItem.description_en,
        description_ja: editingItem.description_ja,
        description_vi: editingItem.description_vi,
        price: editingItem.price,
        image_url: editingItem.image_url,
        available: editingItem.available,
        weekday_visibility: editingItem.weekday_visibility,
        stock_level: editingItem.stock_level,
        position: editingItem.position || 0
      };

      if (editingItem.id) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success(t('item.update_success'));
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);

        if (error) throw error;
        toast.success(t('item.create_success'));
      }

      setIsItemModalOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      toast.error(t('item.save_error'));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      toast.success(t('item.delete_error'));
      router.refresh();
    } catch (error: any) {
      console.error('Error deleting menu item:', error);
      toast.error(t('item.delete_error'));
    }
  };

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-300 rounded-md">
        {error}
      </div>
    );
  }

  return (
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
      
      <div className="space-y-6">
        {menuData.map((category) => (
          <Card key={category.id} className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 gap-2 p-4">
              <div className="flex items-center">
                <MenuIcon className="h-5 w-5 mr-2 text-slate-400" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                  {getLocalizedText({
                    name_en: category.name_en,
                    name_ja: category.name_ja,
                    name_vi: category.name_vi
                  }, locale)}
                </h3>
              </div>
              <div className="flex space-x-1 sm:space-x-2 self-start sm:self-center">
                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={() => handleOpenItemModal(category)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('add_item')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenCategoryModal(category)}
                >
                  <SquarePen className="mr-2 h-4 w-4" />
                  {t('edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('delete')}
                </Button>
              </div>
            </div>
            <CardContent>
              {category.menu_items.length > 0 ? (
                <div className="space-y-3">
                  {category.menu_items
                    .sort((a, b) => a.position - b.position)
                    .map((item) => (
                      <Card
                        key={item.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 hover:shadow-md transition-shadow relative"
                      >
                        {item.stock_level !== undefined && 
                         item.stock_level < 10 && 
                         FEATURE_FLAGS.lowStockAlerts && (
                          <div className="absolute top-2 right-2 bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200 text-xs px-2 py-0.5 rounded-full flex items-center">
                            <AlertTriangle size={12} className="mr-1" />
                            {t('low_stock')} ({item.stock_level})
                          </div>
                        )}
                        <div className="flex items-center mb-2 sm:mb-0 flex-grow">
                          <img
                            src={item.image_url || 'https://placehold.co/80x60/E2E8F0/334155?text=Item'}
                            alt={getLocalizedText({
                              en: item.name_en,
                              ja: item.name_ja,
                              vi: item.name_vi
                            }, locale)}
                            className="w-20 h-16 object-cover rounded-md mr-4 flex-shrink-0"
                          />
                          <div className="flex-grow">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                              {getLocalizedText({
                                en: item.name_en,
                                ja: item.name_ja,
                                vi: item.name_vi
                              }, locale)}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {t('currency_format', { value: item.price })}
                            </p>
                            <StarRating 
                              value={item.averageRating || 0} 
                              count={item.reviewCount || 0}
                              size="sm"
                            />
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.weekday_visibility.map(day => (
                                <span
                                  key={day}
                                  className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded"
                                >
                                  {t(`weekdays.${day.toLowerCase()}_short`)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1 sm:space-x-2 mt-2 sm:mt-0 self-end sm:self-center flex-shrink-0">
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${
                              item.available
                                ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300'
                            }`}
                          >
                            {item.available ? t('available') : t('unavailable')}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenItemModal(category, item)}
                          >
                            <SquarePen className="mr-2 h-4 w-4" />
                            {t('edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('delete')}
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                  {t('no_items_in_category')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? t('edit_category') : t('add_category')}
            </DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}>
              {/* Form for category name (multi-language input) */}
              <input
                type="text"
                placeholder={t('category.name_en')}
                value={editingCategory.name_en || ''}
                onChange={(e) => setEditingCategory({
                  ...editingCategory,
                  name_en: e.target.value
                })}
                className="mb-2 w-full p-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder={t('category.name_ja')}
                value={editingCategory.name_ja || ''}
                onChange={(e) => setEditingCategory({
                  ...editingCategory,
                  name_ja: e.target.value
                })}
                className="mb-2 w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder={t('category.name_vi')}
                value={editingCategory.name_vi || ''}
                onChange={(e) => setEditingCategory({
                  ...editingCategory,
                  name_vi: e.target.value
                })}
                className="mb-2 w-full p-2 border rounded"
              />
              <input
                type="number"
                placeholder={t('category.order')}
                value={editingCategory.position}
                onChange={(e) => setEditingCategory({
                  ...editingCategory,
                  position: parseInt(e.target.value) || 0
                })}
                className="mb-2 w-full p-2 border rounded"
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('form_hint')}
              </p>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="default">
                  {t('save')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? t('edit_item') : t('add_item')}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveItem(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <input
                    type="text"
                    placeholder={t('item.name_en')}
                    value={editingItem.name_en || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      name_en: e.target.value
                    })}
                    className="mb-2 w-full p-2 border rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder={t('item.name_ja')}
                    value={editingItem.name_ja || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      name_ja: e.target.value
                    })}
                    className="mb-2 w-full p-2 border rounded"
                  />
                  <input
                    type="text"
                    placeholder={t('item.name_vi')}
                    value={editingItem.name_vi || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      name_vi: e.target.value
                    })}
                    className="mb-2 w-full p-2 border rounded"
                  />

                  <textarea
                    placeholder={t('item.description_en')}
                    value={editingItem.description_en || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      description_en: e.target.value
                    })}
                    className="mb-2 w-full p-2 border rounded"
                  />
                  <textarea
                    placeholder={t('item.description_ja')}
                    value={editingItem.description_ja || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      description_ja: e.target.value
                    })}
                    className="mb-2 w-full p-2 border rounded"
                  />
                  <textarea
                    placeholder={t('item.description_vi')}
                    value={editingItem.description_vi || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      description_vi: e.target.value
                    })}
                    className="mb-2 w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('item.price')}
                    value={editingItem.price || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      price: parseFloat(e.target.value) || 0
                    })}
                    className="mb-2 w-full p-2 border rounded"
                    required
                  />
                  <input
                    type="url"
                    placeholder={t('item.image_url')}
                    value={editingItem.image_url || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      image_url: e.target.value
                    })}
                    className="mb-2 w-full p-2 border rounded"
                  />
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('item.upload_image')}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={() => {/* TODO: Handle image upload */}}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t('item.image_upload_note')}
                    </p>
                  </div>
                  <input
                    type="number"
                    placeholder={t('item.stock_level')}
                    value={editingItem.stock_level || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      stock_level: parseInt(e.target.value)
                    })}
                    className="mb-2 w-full p-2 border rounded"
                  />
                  <div className="my-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingItem.available}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          available: e.target.checked
                        })}
                        className="form-checkbox h-5 w-5 text-[--brand-color] rounded border-slate-300 focus:ring-[--brand-color]"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        {t('item.is_available')}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <WeekdaySelector
                selectedDays={editingItem.weekday_visibility || []}
                onChange={(days) => setEditingItem({
                  ...editingItem,
                  weekday_visibility: days
                })}
              />
              
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                {t('form_hint')}
              </p>
              <DialogFooter className="mt-6 pt-4 border-t dark:border-slate-700">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsItemModalOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="default">
                  {t('save')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

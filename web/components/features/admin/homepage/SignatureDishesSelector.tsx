'use client'

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Star, 
  Search,
  Loader2,
  AlertCircle,
  Filter,
  ChefHat
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";

interface MenuItem {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  description_en?: string;
  description_ja?: string;
  description_vi?: string;
  price: number;
  image_url?: string;
  category_name: string;
  is_signature: boolean;
  available: boolean;
}

interface SignatureDishesProps {
  locale: string;
}

export function SignatureDishesSelector({ locale }: SignatureDishesProps) {
  const t = useTranslations("owner.homepage.signatureDishes");
  //const tCommon = useTranslations("common");
  //const { restaurantSettings } = useRestaurantSettings();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  //const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  const getLocalizedName = (item: MenuItem) => {
    switch (locale) {
      case 'ja': return item.name_ja || item.name_en;
      case 'vi': return item.name_vi || item.name_en;
      default: return item.name_en;
    }
  };

  const getLocalizedDescription = (item: MenuItem) => {
    switch (locale) {
      case 'ja': return item.description_ja || item.description_en || '';
      case 'vi': return item.description_vi || item.description_en || '';
      default: return item.description_en || '';
    }
  };

  // Load menu items
  const loadMenuItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/restaurant/signature-dishes');
      if (!response.ok) throw new Error('Failed to load menu items');
      
      const data = await response.json();
      setMenuItems(data.menuItems || []);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data.menuItems?.map((item: MenuItem) => item.category_name) || [])
      ) as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading menu items:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const toggleSignatureDish = async (itemId: string, isSignature: boolean) => {
    // Optimistically update UI
    setMenuItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, is_signature: isSignature } : item
    ));

    try {
      const response = await fetch('/api/v1/restaurant/signature-dishes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menuItemId: itemId,
          isSignature
        }),
      });

      if (!response.ok) throw new Error('Failed to update signature dish');

      toast.success(
        isSignature 
          ? t('toggle.addedSuccess') 
          : t('toggle.removedSuccess')
      );
    } catch (error) {
      console.error('Error updating signature dish:', error);
      // Revert optimistic update
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, is_signature: !isSignature } : item
      ));
      toast.error(t('toggle.error'));
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = getLocalizedName(item)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      getLocalizedDescription(item)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || item.category_name === selectedCategory;
    
    return matchesSearch && matchesCategory && item.available;
  });

  const signatureDishes = menuItems.filter(item => item.is_signature);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Signature Dishes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            {t('current.title')}
          </CardTitle>
          <CardDescription>
            {t('current.description', { count: signatureDishes.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signatureDishes.length === 0 ? (
            <div className="text-center py-8">
              <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
                {t('current.empty.title')}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('current.empty.description')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {signatureDishes.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  {item.image_url && (
                    <div className="relative h-32">
                      <Image
                        src={item.image_url}
                        alt={getLocalizedName(item)}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{getLocalizedName(item)}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {item.category_name}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        <Star className="mr-1 h-3 w-3" />
                        {t('badge.signature')}
                      </Badge>
                    </div>
                    {getLocalizedDescription(item) && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {getLocalizedDescription(item)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">¥{item.price}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleSignatureDish(item.id, false)}
                      >
                        {t('buttons.remove')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu Items Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('selector.title')}
          </CardTitle>
          <CardDescription>{t('selector.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('info.recommendation')}
            </AlertDescription>
          </Alert>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">{t('filter.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenuItems.map((item) => (
              <Card 
                key={item.id} 
                className={`overflow-hidden cursor-pointer transition-colors ${
                  item.is_signature ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => toggleSignatureDish(item.id, !item.is_signature)}
              >
                {item.image_url && (
                  <div className="relative h-32">
                    <Image
                      src={item.image_url}
                      alt={getLocalizedName(item)}
                      fill
                      className="object-cover"
                    />
                    {item.is_signature && (
                      <Badge className="absolute top-2 right-2 bg-yellow-500 text-yellow-50">
                        <Star className="mr-1 h-3 w-3" />
                        {t('badge.signature')}
                      </Badge>
                    )}
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{getLocalizedName(item)}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {item.category_name}
                      </p>
                    </div>
                    <Checkbox
                      checked={item.is_signature}
                      onChange={() => toggleSignatureDish(item.id, !item.is_signature)}
                      className="ml-2"
                    />
                  </div>
                  {getLocalizedDescription(item) && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {getLocalizedDescription(item)}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">¥{item.price}</span>
                    <span className="text-xs text-gray-500">
                      {item.is_signature ? t('status.selected') : t('status.clickToSelect')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMenuItems.length === 0 && (
            <div className="text-center py-8">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
                {t('search.noResults.title')}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('search.noResults.description')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

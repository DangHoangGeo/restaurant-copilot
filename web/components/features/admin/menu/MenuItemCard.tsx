'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  SquarePen, 
  Trash2, 
  MenuIcon, 
  AlertTriangle,
  Eye,
  EyeOff,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StarRating } from '@/components/ui/star-rating';
import { getLocalizedText } from '@/lib/utils';
import Image from 'next/image';
import { ViewMode } from './MenuSearchFilter';

interface MenuItem {
  id: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  price: number;
  image_url?: string | null;
  available: boolean;
  weekday_visibility: number[];
  stock_level?: number | null;
  averageRating?: number;
  reviewCount?: number;
}

interface MenuItemCardProps {
  item: MenuItem;
  locale: string;
  viewMode: ViewMode;
  isLoading?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailability?: () => void;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  // Drag and drop props for table view
  dragRef?: React.RefCallback<HTMLTableRowElement>;
  dragHandleProps?: React.HTMLAttributes<HTMLElement> | null;
  draggableProps?: React.HTMLAttributes<HTMLElement>;
}

export function MenuItemCard({
  item, 
  locale, 
  viewMode, 
  onEdit, 
  onDelete, 
  onToggleAvailability,
  t,
  dragRef,
  dragHandleProps,
  draggableProps
}: MenuItemCardProps) {
  const itemName = getLocalizedText({
    name_en: item.name_en,
    name_ja: item.name_ja || undefined,
    name_vi: item.name_vi || undefined
  }, locale);

  const isLowStock = item.stock_level !== undefined && item.stock_level !== null && item.stock_level < 10;

  // List View (Default - Mobile Optimized)
  if (viewMode === 'list') {
    return (
      <Card className="p-4 hover:shadow-md transition-all duration-200 relative">
        {/* Low Stock Alert Badge */}
        {isLowStock && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Low Stock
            </Badge>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4">
          {/* Image and basic info section for mobile */}
          <div className="flex gap-3">
            {/* Image */}
            <div className="flex-shrink-0">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={itemName}
                  className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg"
                  width={80}
                  height={80}
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <MenuIcon className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Basic info next to image on mobile, full width on desktop */}
            <div className="flex-1 min-w-0 md:hidden">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate pr-2">
                  {itemName}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <SquarePen className="h-4 w-4 mr-2" />
                      {t('edit')}
                    </DropdownMenuItem>
                    {onToggleAvailability && (
                      <DropdownMenuItem onClick={onToggleAvailability}>
                        {item.available ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Make Unavailable
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Make Available
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={onDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t('currency_format', { value: item.price })}
              </p>

              {/* Status badges with quick toggle */}
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant={item.available ? 'default' : 'secondary'}
                  className={`text-xs cursor-pointer transition-colors ${item.available ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300 hover:bg-green-200' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300 hover:bg-red-200'}`}
                  onClick={onToggleAvailability}
                  title="Click to toggle availability"
                >
                  {item.available ? t('available') : t('unavailable')}
                </Badge>
                {item.stock_level !== undefined && item.stock_level !== null && (
                  <Badge variant="outline" className="text-xs">
                    Stock: {item.stock_level}
                  </Badge>
                )}
              </div>
            </div>

            {/* Desktop layout - info next to image */}
            <div className="hidden md:flex md:flex-1 md:min-w-0 md:justify-between md:items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate pr-2 mb-2">
                  {itemName}
                </h3>
                
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {t('currency_format', { value: item.price })}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <StarRating 
                    value={item.averageRating || 0} 
                    count={item.reviewCount || 0} 
                    size="sm" 
                  />
                  <Badge 
                    variant={item.available ? 'default' : 'secondary'}
                    className={`text-xs cursor-pointer transition-colors ${item.available ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300 hover:bg-green-200' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300 hover:bg-red-200'}`}
                    onClick={onToggleAvailability}
                    title="Click to toggle availability"
                  >
                    {item.available ? t('available') : t('unavailable')}
                  </Badge>
                  {item.stock_level !== undefined && item.stock_level !== null && (
                    <Badge variant="outline" className="text-xs">
                      Stock: {item.stock_level}
                    </Badge>
                  )}
                </div>

                {/* Weekday visibility - compact display */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">Days:</span>
                  {item.weekday_visibility.slice(0, 3).map(day => (
                    <Badge key={day} variant="outline" className="text-xs px-1.5 py-0.5">
                      {t(`weekdays_short.${day}_short`)}
                    </Badge>
                  ))}
                  {item.weekday_visibility.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      +{item.weekday_visibility.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <SquarePen className="h-4 w-4 mr-2" />
                    {t('edit')}
                  </DropdownMenuItem>
                  {onToggleAvailability && (
                    <DropdownMenuItem onClick={onToggleAvailability}>
                      {item.available ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Make Unavailable
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Make Available
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile-only: Additional info below image */}
          <div className="md:hidden space-y-2">
            {/* Rating */}
            <div className="flex items-center">
              <StarRating 
                value={item.averageRating || 0} 
                count={item.reviewCount || 0} 
                size="sm" 
              />
            </div>

            {/* Weekday visibility - compact */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">Days:</span>
              {item.weekday_visibility.slice(0, 4).map(day => (
                <Badge key={day} variant="outline" className="text-xs px-1.5 py-0.5">
                  {day === 1 ? 'Mon' : day === 2 ? 'Tue' : day === 3 ? 'Wed' : day === 4 ? 'Thu' : day === 5 ? 'Fri' : day === 6 ? 'Sat' : 'Sun'}
                </Badge>
              ))}
              {item.weekday_visibility.length > 4 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  +{item.weekday_visibility.length - 4}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Table View
  return (
    <tr 
      ref={dragRef}
      {...draggableProps}
      {...(dragHandleProps || {})}
      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-grab"
    >
      {/* Image */}
      <td className="px-2 sm:px-4 py-3 w-16 sm:w-20">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={itemName}
            className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded"
            width={48}
            height={48}
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <MenuIcon className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" />
          </div>
        )}
      </td>
      
      {/* Name, Price, Status Combined - Mobile Optimized */}
      <td className="px-2 sm:px-4 py-3 min-w-0 flex-1">
        <div className="space-y-1">
          {/* Item name with better truncation */}
          <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-none" title={itemName}>
            {itemName}
          </p>
          
          {/* Price and status on same line for mobile */}
          <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
            <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('currency_format', { value: item.price })}
            </p>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <Badge 
                variant={item.available ? 'default' : 'secondary'}
                className={`text-xs cursor-pointer transition-colors ${item.available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                onClick={onToggleAvailability}
                title="Click to toggle availability"
              >
                {item.available ? t('available') : t('unavailable')}
              </Badge>
              {isLowStock && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                  <span className="hidden sm:inline">Low Stock</span>
                  <span className="sm:hidden">Low</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </td>
      
      {/* Actions - Compact on mobile */}
      <td className="px-2 sm:px-4 py-3 w-16 sm:w-auto">
        <div className="flex gap-0.5 sm:gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 w-8 p-0 sm:h-9 sm:w-9">
            <SquarePen className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 h-8 w-8 p-0 sm:h-9 sm:w-9">
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

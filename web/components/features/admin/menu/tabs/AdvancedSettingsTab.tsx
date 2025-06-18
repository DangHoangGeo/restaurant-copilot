'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeekdaySelector } from '@/components/features/admin/menu/WeekdaySelector';
import { Calendar, Settings, Tag } from 'lucide-react';
import type { StreamlinedMenuItemFormData } from '../ItemModal';
import type { MenuItemCategory } from '@/shared/types/menu';

interface AdvancedSettingsTabProps {
  form: UseFormReturn<StreamlinedMenuItemFormData>;
  categories: MenuItemCategory[];
  isEditing: boolean;
}

export function AdvancedSettingsTab({
  form,
  categories,
  isEditing
}: AdvancedSettingsTabProps) {
  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Advanced Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure category, availability, and scheduling. Default values are already set for quick setup.
        </p>
      </div>

      <div className="space-y-6">
        {/* Category Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Category & Organization</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Menu Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Category cannot be changed when editing. Create a new item to move categories.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Availability Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Availability Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="available"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-medium">Item is available for ordering</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Customers can see and order this item when checked
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Schedule Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Weekly Schedule</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="weekday_visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Days</FormLabel>
                  <div className="space-y-2">
                    <WeekdaySelector 
                      selectedDays={field.value || []} 
                      onChange={field.onChange} 
                    />
                    <p className="text-xs text-muted-foreground">
                      Select which days of the week this item should be available to customers
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Current Settings Summary */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Current Configuration</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">
                  {categories.find(c => c.id === form.watch('category_id'))?.name || 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${form.watch('available') ? 'text-green-600' : 'text-red-600'}`}>
                  {form.watch('available') ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule:</span>
                <span className="font-medium">
                  {form.watch('weekday_visibility')?.length === 7 ? 'All days' : 
                   `${form.watch('weekday_visibility')?.length || 0} day${form.watch('weekday_visibility')?.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">💡 Quick Tips</h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Keep items available unless temporarily out of stock</li>
              <li>• Use weekday scheduling for special items (e.g., weekend brunch)</li>
              <li>• Categories help organize your menu for customers</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

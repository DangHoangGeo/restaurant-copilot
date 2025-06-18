'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PlusCircle, Trash2, ChevronDown, Package, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { StreamlinedMenuItemFormData } from '../ItemModal';

interface VariantsOptionsTabProps {
  form: UseFormReturn<StreamlinedMenuItemFormData>;
  ownerLanguage: 'en' | 'ja' | 'vi';
  onTranslate?: (text: string, field: string, context: 'item' | 'topping') => Promise<{ en: string; ja: string; vi: string }>;
}

// Predefined size options
const PREDEFINED_SIZES = [
  { key: 'S', name_en: 'Small', name_ja: 'スモール', name_vi: 'Nhỏ', priceMultiplier: 0.8 },
  { key: 'M', name_en: 'Medium', name_ja: 'ミディアム', name_vi: 'Vừa', priceMultiplier: 1.0 },
  { key: 'L', name_en: 'Large', name_ja: 'ラージ', name_vi: 'Lớn', priceMultiplier: 1.3 },
];

export function VariantsOptionsTab({
  form,
  ownerLanguage,
  onTranslate
}: VariantsOptionsTabProps) {
  const [isToppingsOpen, setIsToppingsOpen] = useState(false);
  const [isSizesOpen, setIsSizesOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);

  const { fields: toppingFields, append: appendTopping, remove: removeTopping } = useFieldArray({
    control: form.control,
    name: "toppings",
  });

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control: form.control,
    name: "sizes",
  });

  // Auto-open sections when they have data
  useEffect(() => {
    if (toppingFields.length > 0) {
      setIsToppingsOpen(true);
    }
    if (sizeFields.length > 0) {
      setIsSizesOpen(true);
    }
  }, [toppingFields.length, sizeFields.length]);

  const addPredefinedSizes = () => {
    const currentPrice = form.getValues('price') || 0;
    const newSizes = PREDEFINED_SIZES.map((size, index) => ({
      size_key: size.key,
      name_en: size.name_en,
      name_ja: size.name_ja,
      name_vi: size.name_vi,
      price: Math.round(currentPrice * size.priceMultiplier * 100) / 100,
      position: index,
    }));
    
    form.setValue('sizes', newSizes);
    setIsSizesOpen(true);
  };

  const primaryNameField = ownerLanguage === 'en' ? 'name_en' : 
                          ownerLanguage === 'ja' ? 'name_ja' : 'name_vi';

  // Helper function to translate topping names
  const handleTranslateTopping = async (index: number, sourceText: string) => {
    if (!onTranslate || !sourceText.trim()) return;
    
    try {
      const translations = await onTranslate(sourceText, 'name', 'topping');
      
      // Auto-fill all language fields for the topping
      form.setValue(`toppings.${index}.name_en`, translations.en);
      form.setValue(`toppings.${index}.name_ja`, translations.ja);
      form.setValue(`toppings.${index}.name_vi`, translations.vi);
      
      toast.success('Topping translations generated successfully!');
    } catch (error) {
      console.error('Translation failed:', error);
      toast.error('Translation failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Variants & Options</h3>
        <p className="text-sm text-muted-foreground">
          Add sizes, toppings, and manage stock levels. These are optional but help provide more choices for customers.
        </p>
      </div>

      <div className="space-y-4">
        {/* Stock Level Management */}
        <Card>
          <Collapsible open={isStockOpen} onOpenChange={setIsStockOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Stock Management</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Current: {form.watch('stock_level') || 'Unlimited'}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isStockOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <FormField
                  control={form.control}
                  name="stock_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Level</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                          placeholder="Leave empty for unlimited stock"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Set a number to track inventory, or leave empty for unlimited stock
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Size Variants */}
        <Card>
          <Collapsible open={isSizesOpen} onOpenChange={setIsSizesOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Size Variants</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {sizeFields.length} size{sizeFields.length !== 1 ? 's' : ''}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isSizesOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
					className='order-2 sm:order-1'
                    onClick={addPredefinedSizes}
                    disabled={!form.getValues('price')}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Standard Sizes (S, M, L)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
					className='order-1 sm:order-1'
                    onClick={() => appendSize({ 
                      size_key: '', 
                      name_en: '', 
                      name_ja: '', 
                      name_vi: '', 
                      price: 0, 
                      position: sizeFields.length 
                    })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Custom Size
                  </Button>
                </div>
                
                {!form.getValues('price') && (
                  <p className="text-sm text-amber-600">
                    Set a base price first to auto-calculate size prices
                  </p>
                )}

                {sizeFields.map((field, index) => (
                  <Card key={field.id} className="bg-muted/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Size {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSize(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`sizes.${index}.size_key`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Size Code</FormLabel>
                              <FormControl>
                                <Input placeholder="S, M, L, XL..." {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`sizes.${index}.price`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Price</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.00" 
                                  {...f} 
                                  onChange={e => f.onChange(parseFloat(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`sizes.${index}.${primaryNameField}`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Size Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Small, Medium, Large..." {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Toppings */}
        <Card>
          <Collapsible open={isToppingsOpen} onOpenChange={setIsToppingsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Add-on Toppings</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {toppingFields.length} topping{toppingFields.length !== 1 ? 's' : ''}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isToppingsOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendTopping({ 
                    name_en: '', 
                    name_ja: '', 
                    name_vi: '', 
                    price: 0, 
                    position: toppingFields.length 
                  })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Topping
                </Button>

                {toppingFields.map((field, index) => (
                  <Card key={field.id} className="bg-muted/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Topping {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTopping(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Primary Language Field */}
                      <FormField
                        control={form.control}
                        name={`toppings.${index}.${primaryNameField}`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Topping Name ({ownerLanguage.toUpperCase()})</FormLabel>
                            <FormControl>
                              <Input placeholder="Extra cheese, bacon..." {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Translation Button */}
                      {onTranslate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const sourceText = form.getValues(`toppings.${index}.${primaryNameField}`);
                            if (sourceText) {
                              handleTranslateTopping(index, sourceText);
                            }
                          }}
                          disabled={!form.watch(`toppings.${index}.${primaryNameField}`)}
                          className="w-full border-dashed"
                        >
                          <Sparkles className="mr-2 h-4 w-4 text-primary" />
                          Translate to All Languages
                        </Button>
                      )}

                      {/* Other Language Fields - Editable */}
                      <div className="grid grid-cols-1 gap-3">
                        {ownerLanguage !== 'en' && (
                          <FormField
                            control={form.control}
                            name={`toppings.${index}.name_en`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>English Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="English topping name..." {...f} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {ownerLanguage !== 'ja' && (
                          <FormField
                            control={form.control}
                            name={`toppings.${index}.name_ja`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Japanese Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Japanese topping name..." {...f} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {ownerLanguage !== 'vi' && (
                          <FormField
                            control={form.control}
                            name={`toppings.${index}.name_vi`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Vietnamese Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Vietnamese topping name..." {...f} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      
                      {/* Price Field */}
                      <FormField
                        control={form.control}
                        name={`toppings.${index}.price`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Additional Price</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                {...f} 
                                onChange={e => f.onChange(parseFloat(e.target.value) || 0)} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Quick Summary */}
      {(sizeFields.length > 0 || toppingFields.length > 0 || form.watch('stock_level')) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {sizeFields.length > 0 && (
                <p>• {sizeFields.length} size variant{sizeFields.length !== 1 ? 's' : ''} configured</p>
              )}
              {toppingFields.length > 0 && (
                <p>• {toppingFields.length} add-on topping{toppingFields.length !== 1 ? 's' : ''} available</p>
              )}
              {form.watch('stock_level') && (
                <p>• Stock tracking enabled ({form.watch('stock_level')} units)</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

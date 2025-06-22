"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { useTranslations } from "next-intl";
import { Table as TableType } from "../types";
import { Category } from '@/shared/types/menu';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableType[];
  categories: Category[];
  selectedTable: string;
  onTableChange: (tableId: string) => void;
  currentOrderItems: {[key: string]: number};
  onOrderItemsChange: (items: {[key: string]: number}) => void;
  orderNotes: {[key: string]: string};
  onOrderNotesChange: (notes: {[key: string]: string}) => void;
  onCreateOrder: () => void;
  isCreating: boolean;
  locale: string;
}

export function NewOrderModal({
  isOpen,
  onClose,
  tables,
  categories,
  selectedTable,
  onTableChange,
  currentOrderItems,
  onOrderItemsChange,
  // orderNotes,
  // onOrderNotesChange,
  onCreateOrder,
  isCreating,
  locale
}: NewOrderModalProps) {
  const t = useTranslations("owner.orders");
  const tCommon = useTranslations("common");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('createNewOrder')}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Table Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('selectTable')}
            </label>
            <Select value={selectedTable} onValueChange={onTableChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('chooseTable')} />
              </SelectTrigger>
              <SelectContent>
                {tables.map(table => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Menu Items */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('selectItems')}
            </label>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {categories.map(category => (
                <div key={category.id}>
                  <h4 className="font-medium text-lg mb-2">
                    {locale === 'en' ? category.name_en :
                     locale === 'ja' ? category.name_ja :
                     locale === 'vi' ? category.name_vi :
                     category.name_en || ''}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.menu_items?.filter(item => item.available).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">
                            {locale === 'en' ? item.name_en :
                             locale === 'ja' ? item.name_ja :
                             locale === 'vi' ? item.name_vi :
                             item.name_en || ''}
                          </div>
                          <div className="text-sm text-gray-600">
                            ${item.price.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const current = currentOrderItems[item.id] || 0;
                              if (current > 0) {
                                onOrderItemsChange({
                                  ...currentOrderItems,
                                  [item.id]: current - 1
                                });
                              }
                            }}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">
                            {currentOrderItems[item.id] || 0}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const current = currentOrderItems[item.id] || 0;
                              onOrderItemsChange({
                                ...currentOrderItems,
                                [item.id]: current + 1
                              });
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <LoadingButton
            onClick={onCreateOrder}
            loading={isCreating}
            disabled={!selectedTable || Object.keys(currentOrderItems).length === 0}
          >
            {t('createOrder')}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

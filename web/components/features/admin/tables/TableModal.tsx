"use client";

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Table } from '@/shared/types'

export interface TableFormData {
  name: string
  capacity: number
  status: 'available' | 'occupied' | 'reserved'
  isOutdoor: boolean
  isAccessible: boolean
  notes?: string | null
  qrCode?: string | null
  qrCodeCreatedAt?: string | null
}

interface TableModalProps {
  isOpen: boolean
  onClose: () => void
  editingTable: Table | null
  form: UseFormReturn<TableFormData>
  onSubmit: (data: TableFormData) => Promise<void>
  isSaving: boolean
}

export function TableModal({
  isOpen,
  onClose,
  editingTable,
  form,
  onSubmit,
  isSaving
}: TableModalProps) {
  const t = useTranslations("owner.tables");
  const tCommon = useTranslations('common');
  
  const { control, handleSubmit, reset } = form;
  
  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingTable ? t('edit_table') : t('add_table')}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('table_name_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('table_name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('capacity_label')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder={t('capacity_placeholder')} 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('status_label')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_status_placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">{t('status_options.available')}</SelectItem>
                        <SelectItem value="occupied">{t('status_options.occupied')}</SelectItem>
                        <SelectItem value="reserved">{t('status_options.reserved')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center space-x-4">
              <FormField
                control={control}
                name="isOutdoor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('is_outdoor_label')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="isAccessible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('is_accessible_label')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('notes_label')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('notes_placeholder')} 
                      {...field} 
                      value={field.value ?? ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={handleClose}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" variant="default" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? tCommon('saving') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

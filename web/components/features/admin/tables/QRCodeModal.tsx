"use client";

import { RefreshCw, FileDown, Copy, Check} from 'lucide-react'
import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BrandedQRDisplay } from '@/components/ui/branded-qr-display'
import { toast } from 'sonner'
import * as htmlToImage from 'html-to-image'
import { Table } from '@/shared/types'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  table: Table | null,
  restaurantName: string
  qrCodeUrl: string
  onRefreshQR: (table: Table) => void
  isQrCodeOld: (qrCreatedAt: string | null) => boolean
}

export function QRCodeModal({
  isOpen,
  onClose,
  table,
  restaurantName,
  qrCodeUrl,
  onRefreshQR,
  isQrCodeOld
}: QRCodeModalProps) {
  const t = useTranslations("owner.tables");
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const downloadQrCode = async () => {
    if (!qrCodeRef.current) return;
    
    setIsDownloadingQr(true);
    try {
      const dataUrl = await htmlToImage.toPng(qrCodeRef.current, {
        backgroundColor: 'white',
        width: 400,
        height: 400,
      });
      
      const link = document.createElement('a');
      link.download = `${table?.name || 'table'}-qr-code.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success(t('notifications.qr_downloaded'));
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error(t('errors.qr_download_failed'));
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const copyToClipboard = async () => {
    if (!qrCodeUrl) return;
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      toast.success(t('notifications.link_copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      toast.error(t('errors.copy_failed'));
    }
  };

  const handleRefreshQR = () => {
    if (table) {
      onRefreshQR(table);
    }
  };

  if (!table) return null;

  const isOldQR = table.qr_code_created_at && isQrCodeOld(table.qr_code_created_at);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{t('qr_for_table')} {table.name}</DialogTitle>
          
        </DialogHeader>
        
        <div className="space-y-4">
          {isOldQR && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                {t('qr_refresh_reminder')}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshQR}
                className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-900/30"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {t('refresh_qr')}
              </Button>
            </div>
          )}
          
          <div ref={qrCodeRef} className="flex justify-center">
              <BrandedQRDisplay
                value={qrCodeUrl}
                size={200}
                restaurantName={restaurantName}
                tableName={table.name}
              />
          </div>
          
          <div className="text-xs text-slate-500 dark:text-slate-400 break-all bg-slate-50 dark:bg-slate-800 p-2 rounded">
            {qrCodeUrl}
          </div>
        </div>
        
        <DialogFooter className="flex flex-row gap-2 sm:gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={copyToClipboard}
            className="flex-1"
            disabled={!qrCodeUrl}
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? t('notifications.link_copied') : t('copy_link')}
          </Button>
          <Button
            onClick={downloadQrCode}
            disabled={isDownloadingQr || !qrCodeUrl}
            className="flex-1"
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isDownloadingQr ? t('downloading') : t('download_png')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

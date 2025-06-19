'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeDisplay } from '@/components/ui/qr-code-display';
import { Copy, Check } from 'lucide-react';

interface QRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  restaurantSubdomain: string;
}

export function QRCodeDialog({ isOpen, onClose, sessionId, restaurantSubdomain }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations('customer.home');

  // Construct the menu URL with sessionId
  const menuUrl = `https://${restaurantSubdomain}.coorder.ai/menu?sessionId=${sessionId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('qr_dialog.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {t('qr_dialog.description')}
          </p>
          
          <div className="bg-white p-4 rounded-lg">
            <QRCodeDisplay value={menuUrl} size={200} />
          </div>
          
          <div className="w-full space-y-2">
            
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="w-full flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  {/* Assuming 'copied' is a common key or create it in home.json */}
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {/* Assuming 'copy' is a common key or create it in home.json */}
                  Copy Link
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full">
              {t('close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

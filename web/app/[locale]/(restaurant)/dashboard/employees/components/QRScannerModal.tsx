'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const QrReader = dynamic(() => import('react-qr-reader').then(mod => ({ default: mod.QrReader })), { ssr: false });

export default function QRScannerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [result, setResult] = useState('');
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <QrReader onResult={(result: any) => { if (result?.text) setResult(result.text); }} constraints={{ facingMode: 'environment' }} />
        {result}
      </DialogContent>
    </Dialog>
  );
}

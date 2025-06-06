'use client'
import QRCode from 'react-qr-code'

interface QRCodeDisplayProps {
  value: string
  size?: number
}

export function QRCodeDisplay({ value, size = 256 }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size }} className="bg-white p-2 rounded-lg">
        <QRCode value={value || ' '} size={size - 16} />
      </div>
      <p className="mt-2 text-xs break-all text-center max-w-[256px] text-muted-foreground">{value}</p>
    </div>
  )
}

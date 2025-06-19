'use client'
import QRCode from 'react-qr-code'

interface BrandedQRDisplayProps {
  value: string
  size?: number
  restaurantName: string
  tableName: string
}

export function BrandedQRDisplay({ 
  value, 
  size = 400, 
  restaurantName, 
  tableName 
}: BrandedQRDisplayProps) {
  const padding = 40;
  const qrSize = Math.max(200, size - (padding * 2));
  const headerHeight = 120;
  const footerHeight = 60;
  const totalHeight = size + headerHeight + footerHeight;

  if (!value) {
    return (
      <div 
        className="flex flex-col items-center justify-center bg-gray-100 border-2 border-gray-300 rounded-lg"
        style={{ width: size, height: totalHeight }}
      >
        <p className="text-gray-500">No QR code data</p>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col items-center bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg"
      style={{ width: size, height: totalHeight }}
    >
      {/* Header with Restaurant and Table Name */}
      <div className="w-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-2 break-words">{restaurantName}</h1>
        <h2 className="text-xl font-bold break-words">{tableName}</h2>
      </div>
      
      {/* Scan to Order Text */}
      <div className="w-full pt-4 text-center bg-gray-50">
        <p className="text-lg font-bold text-gray-800">Scan to Order</p>
      </div>
      
      {/* QR Code */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div style={{ width: qrSize, height: qrSize }} className="bg-white">
          <QRCode 
            value={value} 
            size={qrSize}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>
      </div>
      <p className="text-xs text-gray-600 mb-4">Powered by coorder.ai</p>
    </div>
  )
}

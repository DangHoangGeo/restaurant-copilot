"use client";

import React from 'react';
import QRCode from 'react-qr-code';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Not strictly needed here but good for consistency

interface QrCodeDisplayPageClientProps {
  tableId: string;
  tableName: string;
  locale: string;
  restaurantSubdomain: string;
  restaurantIdQueryParam: string; // To construct "Back to Tables" link correctly
}

export default function QrCodeDisplayPageClient({
  tableId,
  tableName,
  locale,
  restaurantSubdomain,
  restaurantIdQueryParam,
}: QrCodeDisplayPageClientProps) {

  // Construct the URL for the QR code
  // Example: https://myresto.shop-copilot.com/en/customer/order?tableId=xyz123
  // Ensure your domain and path structure match this.
  const qrUrl = `https://${restaurantSubdomain}.shop-copilot.com/${locale}/customer/order?tableId=${tableId}`;

  const handleDownload = () => {
    const svgElement = document.getElementById('qr-code-svg');
    if (!svgElement) {
      console.error("QR Code SVG element not found.");
      alert("Could not download QR code. Element not found.");
      return;
    }

    // Create a clone of the SVG to manipulate (e.g., add white background)
    const clonedSvgElement = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvgElement.setAttribute("width", "256"); // Ensure size for canvas
    clonedSvgElement.setAttribute("height", "256");

    // Add a white background rectangle to the cloned SVG
    // This is important because SVGs can have transparent backgrounds
    const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backgroundRect.setAttribute("x", "0");
    backgroundRect.setAttribute("y", "0");
    backgroundRect.setAttribute("width", "100%"); // Or specific size like "256"
    backgroundRect.setAttribute("height", "100%"); // Or specific size like "256"
    backgroundRect.setAttribute("fill", "white");
    clonedSvgElement.insertBefore(backgroundRect, clonedSvgElement.firstChild);


    const svgString = new XMLSerializer().serializeToString(clonedSvgElement);
    const canvas = document.createElement('canvas');

    // Set canvas dimensions. Higher resolution for better quality if needed.
    const scaleFactor = 2; // For a 512x512 PNG from a 256x256 SVG
    canvas.width = 256 * scaleFactor;
    canvas.height = 256 * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Canvas context not available.");
      alert("Could not download QR code. Canvas context error.");
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white'; // Ensure canvas background is white
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Draw image scaled

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      const safeTableName = tableName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''); // Sanitize filename
      downloadLink.download = `table-${safeTableName || tableId}-qr.png`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.onerror = (e) => {
        console.error("Error loading SVG image for canvas conversion:", e);
        alert("Error preparing QR code for download.");
    };
    // For SVG to Image conversion, ensure proper encoding, especially for foreign characters
    // Using btoa(unescape(encodeURIComponent(svgString))) is a common method but unescape is deprecated.
    // A more modern approach is to use a URL with utf-8 encoded SVG data.
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  };

  const containerClass = "flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl";
  const titleClass = "text-2xl font-semibold text-gray-800 mb-2 text-center";
  const subtitleClass = "text-sm text-gray-600 mb-6 text-center";
  const qrWrapperClass = "p-4 bg-gray-100 border border-gray-300 rounded-lg inline-block shadow-inner"; // Added border and bg for QR
  const buttonClass = "mt-8 px-6 py-3 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const primaryButtonClass = `bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 ${buttonClass}`;
  const secondaryButtonClass = `bg-gray-500 hover:bg-gray-600 focus:ring-gray-400 ${buttonClass}`;

  return (
    <div className={containerClass}>
      <h1 className={titleClass}>QR Code for Table: {tableName}</h1>
      <p className={subtitleClass}>Scan this code with a smartphone to access the customer order page.</p>

      <div className={qrWrapperClass}>
        <QRCode
          value={qrUrl}
          size={256} // The actual render size of the SVG
          level="H" // Error correction level: L, M, Q, H
          bgColor="transparent" // SVG background (canvas will handle PNG background)
          fgColor="#000000" // QR code color
          id="qr-code-svg" // ID for the download function to select the SVG
        />
      </div>

      <button
        onClick={handleDownload}
        className={primaryButtonClass}
      >
        Download PNG
      </button>

      <Link href={`/${locale}/dashboard/tables?restaurantId=${restaurantIdQueryParam}`} legacyBehavior>
        <a className={`${secondaryButtonClass} mt-4`}>
          Back to Tables List
        </a>
      </Link>
      <p className="mt-6 text-xs text-gray-500 text-center max-w-md">
        <strong>URL:</strong> {qrUrl}<br/>
        Ensure your restaurant's subdomain and customer ordering path are correctly configured.
        The QR code links to the above URL.
      </p>
    </div>
  );
}

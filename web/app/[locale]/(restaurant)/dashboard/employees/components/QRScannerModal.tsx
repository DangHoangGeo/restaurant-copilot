"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, XCircle } from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  // employeeId?: string; // Not used for now, QR code should contain employeeId
}

const QR_READER_ELEMENT_ID = "qr-reader-region";

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const t = useTranslations("owner.employees.qrScannerModal");
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScannerInitialized, setIsScannerInitialized] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode(QR_READER_ELEMENT_ID, { verbose: false });
      }
      const qrScanner = qrScannerRef.current;

      if (qrScanner.getState() === Html5QrcodeScannerState.SCANNING ||
          qrScanner.getState() === Html5QrcodeScannerState.PAUSED) { // PAUSED means it was stopped by code
        // Already scanning or was stopped programmatically, might not need to restart
        // or might need specific resume logic if library supports it.
        // For this version, if it was stopped, we might need to ensure it's fully cleared before restart
        // or that start handles this. Let's assume start is idempotent or handles prior states.
      }

      setScanError(null); // Reset error on open
      setIsScannerInitialized(false); // Will be true after successful start

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0, // Square-ish scan box
      };

      const successCallback = (decodedText: string) => {
        if (qrScannerRef.current && qrScannerRef.current.isScanning) {
           qrScannerRef.current.stop()
            .then(() => {
              setIsScannerInitialized(false); // Mark as stopped
              onScanSuccess(decodedText);
              // onClose(); // Let parent decide to close on success
            })
            .catch(err => {
              console.error("QRScanner: Error stopping scanner on success", err);
              setScanError(t("errors.stopError"));
              // Still call onScanSuccess as QR was read
              onScanSuccess(decodedText);
            });
        } else { // Fallback if already stopped by quick succession
            onScanSuccess(decodedText);
        }
      };

      const errorCallback = () => {
        // This callback is often for non-fatal errors during scanning attempt.
        // console.warn("QRScanner: Scan attempt failed:", errorMessage);
        // setScanError(t("errors.scanRegion")); // Can be too noisy
      };

      qrScanner.start(
        { facingMode: "environment" }, // Camera constraints: prefer back camera
        config,
        successCallback,
        errorCallback
      )
      .then(() => {
        setIsScannerInitialized(true);
      })
      .catch((err) => {
        console.error("QRScanner: Error starting scanner:", err);
        if (err.name === "NotAllowedError") {
          setScanError(t("errors.permissionDenied"));
        } else if (err.name === "NotFoundError") {
          setScanError(t("errors.noCameraFound"));
        } else {
          setScanError(`${t("errors.startError")}: ${err.message}`);
        }
        setIsScannerInitialized(false);
      });

    } else { // isOpen is false
      if (qrScannerRef.current) {
        if (qrScannerRef.current.isScanning) {
          qrScannerRef.current.stop()
            .then(() => {
              // console.log("QRScanner: Stopped on close.");
              setIsScannerInitialized(false);
              if(qrScannerRef.current) qrScannerRef.current.clear(); // Clear after stop
            })
            .catch(err => {
              console.error("QRScanner: Error stopping scanner on close", err);
              if(qrScannerRef.current) qrScannerRef.current.clear(); // Still attempt to clear
            });
        } else {
            // If not scanning but instance exists (e.g. failed to start but instance was created)
            qrScannerRef.current.clear();
            // console.log("QRScanner: Cleared non-scanning instance on close.");
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // onScanSuccess, t should be stable if from useTranslations

  // Ensure cleanup on component unmount
  useEffect(() => {
    const scanner = qrScannerRef.current; // Capture current ref value
    return () => {
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop()
            .then(() => scanner.clear())
            .catch(err => {
              console.error("QRScanner: Error stopping/clearing scanner on unmount", err);
              scanner.clear(); // Attempt to clear anyway
            });
        } else {
          scanner.clear();
        }
        qrScannerRef.current = null; // Clear the ref
      }
    };
  }, []);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="my-4">
          <div id={QR_READER_ELEMENT_ID} style={{ width: "100%", minHeight: "250px", border: isScannerInitialized ? "1px solid green" : "1px dashed gray" }} />
          {!isScannerInitialized && !scanError && (
            <p className="text-sm text-muted-foreground text-center mt-2">{t("initializing")}</p>
          )}
          {scanError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("errors.scanErrorTitle")}</AlertTitle>
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {/* Button to manually stop/start might be useful for user if camera freezes, but adds complexity. */}
          {/* For now, rely on automatic start and stop on success/close. */}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              <XCircle className="mr-2 h-4 w-4" />{t("actions.close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

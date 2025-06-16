"use client";

import React from "react";
import { useToast } from "./use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "./button";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`
              relative p-4 rounded-lg shadow-lg border backdrop-blur-sm
              ${toast.variant === "destructive" 
                ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100" 
                : toast.variant === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100"
                : "bg-white border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {toast.variant === "destructive" && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                {toast.variant === "success" && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {(!toast.variant || toast.variant === "default") && (
                  <Info className="h-4 w-4 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <div className="font-medium text-sm">{toast.title}</div>
                )}
                {toast.description && (
                  <div className="text-sm opacity-90 mt-1">{toast.description}</div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

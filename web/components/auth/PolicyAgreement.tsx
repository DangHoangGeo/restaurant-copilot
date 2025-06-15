"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ExternalLink, FileText, Shield } from "lucide-react";

interface PolicyAgreementProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
  required?: boolean;
  className?: string;
  termsUrl?: string;
  privacyUrl?: string;
  showAsModal?: boolean;
}

export function PolicyAgreement({
  checked,
  onCheckedChange,
  error,
  required = true,
  className,
  termsUrl = "/terms",
  privacyUrl = "/privacy",
  showAsModal = false,
}: PolicyAgreementProps) {
  const t = useTranslations("auth");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const fieldId = `policy-agreement-${Math.random().toString(36).substr(2, 9)}`;

  const PolicyLink = ({ 
    href, 
    children, 
    onClick 
  }: { 
    href: string; 
    children: React.ReactNode; 
    onClick?: () => void;
  }) => {
    if (showAsModal && onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-colors font-medium"
        >
          {children}
        </button>
      );
    }

    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-colors font-medium inline-flex items-center gap-1"
      >
        {children}
        <ExternalLink className="w-3 h-3" />
      </Link>
    );
  };

  const TermsContent = () => (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
        <FileText className="w-5 h-5" />
        <span className="font-medium">Terms of Service</span>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-slate-600 dark:text-slate-400">
          {t("terms.preview") || "By using our service, you agree to these terms. Please read them carefully."}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
          {t("terms.fullText") || "For the complete terms of service, please visit our full terms page."}
        </p>
      </div>
    </div>
  );

  const PrivacyContent = () => (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
        <Shield className="w-5 h-5" />
        <span className="font-medium">Privacy Policy</span>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-slate-600 dark:text-slate-400">
          {t("privacy.preview") || "We respect your privacy and are committed to protecting your personal data."}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
          {t("privacy.fullText") || "For the complete privacy policy, please visit our full privacy page."}
        </p>
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start space-x-3">
        <Checkbox
          id={fieldId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          required={required}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(
            "mt-0.5 border-slate-300 dark:border-slate-600",
            "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
            error && "border-red-500"
          )}
        />
        
        <div className="flex-1 min-w-0">
          <Label 
            htmlFor={fieldId}
            className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer"
          >
            {t("policyAgreement.text") || "I agree to the"}{" "}
            
            {showAsModal ? (
              <>
                <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
                  <DialogTrigger asChild>
                    <PolicyLink href="" onClick={() => setShowTermsModal(true)}>
                      {t("policyAgreement.terms") || "Terms of Service"}
                    </PolicyLink>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Terms of Service</DialogTitle>
                    </DialogHeader>
                    <TermsContent />
                    <div className="flex justify-between items-center pt-4 border-t">
                      <Link 
                        href={termsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        View full terms
                      </Link>
                      <Button onClick={() => setShowTermsModal(false)}>
                        Close
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {" "}{t("policyAgreement.and") || "and"}{" "}
                
                <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
                  <DialogTrigger asChild>
                    <PolicyLink href="" onClick={() => setShowPrivacyModal(true)}>
                      {t("policyAgreement.privacy") || "Privacy Policy"}
                    </PolicyLink>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Privacy Policy</DialogTitle>
                    </DialogHeader>
                    <PrivacyContent />
                    <div className="flex justify-between items-center pt-4 border-t">
                      <Link 
                        href={privacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        View full privacy policy
                      </Link>
                      <Button onClick={() => setShowPrivacyModal(false)}>
                        Close
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <PolicyLink href={termsUrl}>
                  {t("policyAgreement.terms") || "Terms of Service"}
                </PolicyLink>
                
                {" "}{t("policyAgreement.and") || "and"}{" "}
                
                <PolicyLink href={privacyUrl}>
                  {t("policyAgreement.privacy") || "Privacy Policy"}
                </PolicyLink>
              </>
            )}
            
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            )}
          </Label>
        </div>
      </div>
      
      {error && (
        <p 
          id={`${fieldId}-error`}
          className="text-xs text-red-600 dark:text-red-400 ml-6"
        >
          {error}
        </p>
      )}
    </div>
  );
}

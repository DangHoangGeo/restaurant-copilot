"use client";
import React, { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check } from "lucide-react";
import { PRICING_PLANS, PRICING_CONFIG } from "@/config/pricing";

export const PricingSection = () => {
  const t = useTranslations("landing");
  const locale = useLocale();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: PRICING_CONFIG.currency,
      minimumFractionDigits: 0,
    }).format(price);

  const handlePlanSelection = (planId: string) => {
    localStorage.setItem("selectedPlan", planId);
    localStorage.setItem("selectedBillingCycle", billingCycle);
    window.location.href = `/${locale}/signup?plan=${planId}&billing=${billingCycle}`;
  };

  return (
    <section className="py-20 px-5" style={{ background: "linear-gradient(160deg, #EFE0CA 0%, #F5EAD8 100%)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-medium tracking-tight text-[#2E2117]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {t("pricing.title")}
          </h2>
          <p className="mt-4 text-base text-[#8B6E5A] max-w-xl mx-auto leading-relaxed">
            {t("pricing.subtitle")}
          </p>

          {/* Billing toggle */}
          <div
            className="inline-flex mt-8 rounded-full p-1"
            style={{ background: "rgba(171,110,60,0.08)", border: "1px solid rgba(171,110,60,0.15)" }}
          >
            <button
              onClick={() => setBillingCycle("monthly")}
              className="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200"
              style={
                billingCycle === "monthly"
                  ? { background: "linear-gradient(135deg, #AB6E3C 0%, #8B5A2B 100%)", color: "#fff", boxShadow: "0 2px 8px rgba(171,110,60,0.28)" }
                  : { color: "#8B6E5A" }
              }
            >
              {t("pricing.billing.monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className="relative px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200"
              style={
                billingCycle === "yearly"
                  ? { background: "linear-gradient(135deg, #AB6E3C 0%, #8B5A2B 100%)", color: "#fff", boxShadow: "0 2px 8px rgba(171,110,60,0.28)" }
                  : { color: "#8B6E5A" }
              }
            >
              {t("pricing.billing.yearly")}
              {billingCycle !== "yearly" && (
                <span
                  className="absolute -top-2 -right-2 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "#36B080" }}
                >
                  {t("pricing.billing.save_20")}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRICING_PLANS.map((plan) => {
            const monthlyEquiv =
              billingCycle === "yearly" ? plan.price.yearly / 12 : plan.price.monthly;
            const annualTotal = plan.price.yearly;

            return (
              <div
                key={plan.id}
                className="relative rounded-2xl p-6 flex flex-col"
                style={
                  plan.highlighted
                    ? {
                        background: "#FEFAF6",
                        border: "2px solid rgba(171,110,60,0.35)",
                        boxShadow: "0 4px 24px rgba(171,110,60,0.14)",
                      }
                    : {
                        background: "#FEFAF6",
                        border: "1px solid rgba(171,110,60,0.10)",
                        boxShadow: "0 2px 12px rgba(171,110,60,0.06)",
                      }
                }
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="text-white text-[11px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
                      style={{ background: "linear-gradient(135deg, #AB6E3C 0%, #8B5A2B 100%)" }}
                    >
                      {t("pricing.popular")}
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3
                    className="text-lg font-semibold text-[#2E2117] mb-1"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {t(`pricing.plans.${plan.id}.title`)}
                  </h3>
                  <p className="text-sm text-[#8B6E5A] leading-relaxed">
                    {t(`pricing.plans.${plan.id}.description`)}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold text-[#2E2117]">
                      {formatPrice(monthlyEquiv)}
                    </span>
                    <span className="text-sm text-[#8B6E5A]">/{t("pricing.billing.per_month")}</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-xs text-[#8B6E5A] mt-1">
                      {t("pricing.billing.billed_yearly")} ({formatPrice(annualTotal)})
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                        style={{ background: "rgba(54,176,128,0.14)" }}
                      >
                        <Check size={10} style={{ color: "#36B080" }} strokeWidth={3} />
                      </div>
                      <span className="text-sm text-[#5A3E2B] leading-snug">
                        {t(`pricing.features.${feature}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelection(plan.id)}
                  className="w-full h-11 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-200"
                  style={
                    plan.highlighted
                      ? {
                          background: "linear-gradient(135deg, #AB6E3C 0%, #8B5A2B 100%)",
                          color: "#fff",
                          boxShadow: "0 4px 16px rgba(171,110,60,0.28)",
                        }
                      : {
                          background: "transparent",
                          color: "#AB6E3C",
                          border: "1.5px solid rgba(171,110,60,0.35)",
                        }
                  }
                >
                  {t(`pricing.cta.${plan.buttonText || "choose_plan"}`)}
                </button>

                {plan.id !== "enterprise" && (
                  <p className="text-center text-[11px] text-[#8B6E5A] mt-3">
                    {t("pricing.trial_info", { days: PRICING_CONFIG.trialDays })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

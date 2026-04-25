"use client";
import React, { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, ArrowRight } from "lucide-react";
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
    <section className="bg-[#ece4d6] px-5 py-20 text-[#18120c] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-4 text-sm font-semibold text-[#9d6338]">
              {t("pricing.eyebrow")}
            </p>
            <h2 className="max-w-xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
            {t("pricing.title")}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#725f4c]">
            {t("pricing.subtitle")}
            </p>
          </div>

          <div
            className="inline-flex w-fit rounded-lg border border-[#17110b]/10 bg-[#17110b]/5 p-1"
          >
            <button
              onClick={() => setBillingCycle("monthly")}
              className="rounded-md px-5 py-2 text-sm font-semibold transition-all duration-200"
              style={
                billingCycle === "monthly"
                  ? { background: "#17110b", color: "#fff7e9", boxShadow: "0 2px 8px rgba(23,17,11,0.20)" }
                  : { color: "#725f4c" }
              }
            >
              {t("pricing.billing.monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className="relative rounded-md px-5 py-2 text-sm font-semibold transition-all duration-200"
              style={
                billingCycle === "yearly"
                  ? { background: "#17110b", color: "#fff7e9", boxShadow: "0 2px 8px rgba(23,17,11,0.20)" }
                  : { color: "#725f4c" }
              }
            >
              {t("pricing.billing.yearly")}
              {billingCycle !== "yearly" && (
                <span
                  className="absolute -right-2 -top-2 rounded-md bg-[#76945e] px-1.5 py-0.5 text-[10px] font-semibold text-white"
                >
                  {t("pricing.billing.save_20")}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => {
            const monthlyEquiv =
              billingCycle === "yearly" ? plan.price.yearly / 12 : plan.price.monthly;
            const annualTotal = plan.price.yearly;

            return (
              <div
                key={plan.id}
                className="relative flex min-h-[500px] flex-col rounded-lg p-6"
                style={
                  plan.highlighted
                    ? {
                        background: "#17110b",
                        color: "#fff7e9",
                        border: "1px solid rgba(23,17,11,0.80)",
                        boxShadow: "0 30px 70px rgba(23,17,11,0.24)",
                      }
                    : {
                        background: "rgba(255,255,255,0.42)",
                        border: "1px solid rgba(23,17,11,0.10)",
                      }
                }
              >
                {plan.popular && (
                  <div className="absolute right-5 top-5">
                    <span
                      className="rounded-md bg-[#c8793f] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
                    >
                      {t("pricing.popular")}
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className={`mb-1 text-xl font-semibold ${plan.highlighted ? "text-[#fff7e9]" : "text-[#18120c]"}`}>
                    {t(`pricing.plans.${plan.id}.title`)}
                  </h3>
                  <p className={`text-sm leading-relaxed ${plan.highlighted ? "text-[#c9b7a0]" : "text-[#725f4c]"}`}>
                    {t(`pricing.plans.${plan.id}.description`)}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-semibold ${plan.highlighted ? "text-[#fff7e9]" : "text-[#18120c]"}`}>
                      {formatPrice(monthlyEquiv)}
                    </span>
                    <span className={`text-sm ${plan.highlighted ? "text-[#c9b7a0]" : "text-[#725f4c]"}`}>/{t("pricing.billing.per_month")}</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className={`mt-1 text-xs ${plan.highlighted ? "text-[#a99782]" : "text-[#725f4c]"}`}>
                      {t("pricing.billing.billed_yearly")} ({formatPrice(annualTotal)})
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${plan.highlighted ? "bg-[#8db87a]/20" : "bg-[#76945e]/16"}`}>
                        <Check size={10} style={{ color: "#8db87a" }} strokeWidth={3} />
                      </div>
                      <span className={`text-sm leading-snug ${plan.highlighted ? "text-[#ddcfbc]" : "text-[#4d3b2d]"}`}>
                        {t(`pricing.features.${feature}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelection(plan.id)}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
                  style={
                    plan.highlighted
                      ? {
                          background: "#c8793f",
                          color: "#fff",
                          boxShadow: "0 14px 34px rgba(200,121,63,0.28)",
                        }
                      : {
                          background: "#17110b",
                          color: "#fff7e9",
                        }
                  }
                >
                  {t(`pricing.cta.${plan.buttonText || "choose_plan"}`)}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {plan.id !== "enterprise" && (
                  <p className={`mt-3 text-center text-[11px] ${plan.highlighted ? "text-[#a99782]" : "text-[#725f4c]"}`}>
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

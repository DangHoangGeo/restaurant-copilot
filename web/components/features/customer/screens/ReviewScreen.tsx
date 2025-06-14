// web/components/features/customer/screens/ReviewScreen.tsx
"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { AnimatedRestaurantHeader } from "@/components/common/AnimatedRestaurantHeader";
import type { RestaurantSettings } from "@/shared/types/customer";
import { ViewProps, ViewType, ReviewViewProps, ThankYouScreenViewProps } from "./types"; // Updated imports

interface ReviewScreenProps {
  setView: (v: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  viewProps?: ReviewViewProps; // Use specific ReviewViewProps
  featureFlags: { // Assuming this comes from CustomerClientContent
    advancedReviews: boolean;
  };
}

export function ReviewScreen({
  setView,
  restaurantSettings,
  viewProps,
  featureFlags,
}: ReviewScreenProps) {
  const t = useTranslations("Customer");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const orderId = viewProps?.orderId; // Get orderId from viewProps

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setError(t("review.rating_required_error") || "Please select a rating.");
      return;
    }
    if (!orderId) {
      setError(t("review.order_id_missing_error") || "Order ID is missing, cannot submit review.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      // Simulate API call
      console.log("Submitting review:", { orderId, rating, comment });
      await new Promise(resolve => setTimeout(resolve, 1000));
      // const response = await fetch('/api/v1/reviews/submit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ orderId, rating, comment, items: viewProps?.items }),
      // });
      // const data = await response.json();
      // if (!data.success) throw new Error(data.error || "Failed to submit review.");
      setSubmitSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("review.submit_error") || "An error occurred while submitting your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-md mx-auto p-4 text-center">
        <Star className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-3">{t("review.thank_you_title")}</h2>
        <p className="text-gray-600 mb-6">{t("review.thank_you_message")}</p>
        <Button
          onClick={() => setView("thankyou", { orderId, items: viewProps?.items, total: 0 /* Recalculate or pass total if needed */ } as ThankYouScreenViewProps)}
          style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
          className="text-white hover:opacity-90"
        >
          {t("thankyou.back_to_order_details")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AnimatedRestaurantHeader
        restaurantSettings={{
          name: restaurantSettings.name || "Restaurant",
          logoUrl: restaurantSettings.logoUrl
        }}
        rating={4.8}
        badgeText="Reviews"
        badgeIcon={Star}
        className="border-b border-slate-200 dark:border-slate-700"
      />
      
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button
            onClick={() => setView("thankyou", { orderId, items: viewProps?.items, total: 0 } as ThankYouScreenViewProps)}
            variant="ghost"
          size="sm"
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t("review.title")}</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {t("review.rate_experience_for_order")} {orderId && <span className="font-mono text-sm">#{orderId}</span>}
        </h2>
        
        <div className="mb-6">
          <p className="mb-2 font-medium">{t("review.overall_rating")}</p>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-8 w-8 cursor-pointer ${
                  rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                }`}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
        </div>

        {featureFlags.advancedReviews && viewProps?.items && viewProps.items.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">{t("review.rate_items")}</h3>
            <div className="space-y-3">
              {viewProps.items.map(item => (
                <div key={item.itemId} className="p-3 border rounded-md">
                  <p className="font-medium">{item.name || item.itemName}</p>
                  {/* Add item-specific rating UI here if needed */}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="comment" className="block mb-2 font-medium">
            {t("review.comments_label")}
          </label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("review.comments_placeholder")}
            rows={4}
            maxLength={500}
          />
           <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 {t("checkout.characters")}
          </p>
        </div>

        <Button
          onClick={handleSubmitReview}
          disabled={isSubmitting}
          size="lg"
          style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
          className="w-full text-white hover:opacity-90"
        >
          {isSubmitting ? t("review.submitting_review") : t("review.submit_review_button")}
        </Button>
      </Card>
      </div>
    </div>
  );
}

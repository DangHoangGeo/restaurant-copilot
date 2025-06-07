// web/components/features/customer/screens/ReviewScreen.tsx
"use client";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import type { RestaurantSettings } from "@/shared/types/customer";

interface ReviewScreenProps {
  setView: (v: string, props?: any) => void;
  restaurantSettings: RestaurantSettings;
  viewProps: {
    menuItemId: string;
    menuItemName: string;
    orderId?: string;
  };
  featureFlags: {
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
  const { menuItemId, menuItemName, orderId } = viewProps;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!featureFlags.advancedReviews) {
    setView("menu"); 
    return <p>Review feature is not available. Redirecting...</p>;
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert(t("review.rating_required_alert"));
      return;
    }
    setIsSubmitting(true);
    console.log("Submitting review:", { menuItemId, rating, comment, orderId });
    // Mock API call
    setTimeout(() => {
        setSubmitted(true);
        setIsSubmitting(false);
    }, 1000);
    // TODO: Replace with actual API call:
    // try {
    //   const response = await fetch('/api/v1/reviews/submit', { /* ... */ });
    //   // ... handle response
    // } catch (error) { /* ... handle error */ }
    // finally { setIsSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <ThumbsUp
          className="mx-auto mb-6 text-green-500 dark:text-green-400"
          size={64}
        />
        <h2 className="text-3xl font-bold mb-3">
          {t("review.submission_thank_you_title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          {t("review.submission_thank_you_message")}
        </p>
        <Button
          onClick={() => setView("thankyou", viewProps)} // Go back to thank you with original props
          size="lg"
          style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
          className="text-white hover:opacity-90"
        >
          {t("thankyou.back_to_menu_button")} {/* Or a more specific "Back to Order" */}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button
        onClick={() => setView("thankyou", viewProps)} 
        variant="ghost"
        className="mb-4 -ml-2"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("review.back_to_summary_button") || "Back to Order Summary"}
      </Button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
        {t("review.title")}
      </h2>
      <p className="text-center text-lg mb-6 text-slate-600 dark:text-slate-400">
        {menuItemName}
      </p>
      <Card className="max-w-md mx-auto p-4 sm:p-6">
        <form onSubmit={handleSubmitReview} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-center mb-2">
              {t("review.rating_label")}
            </label>
            <div className="flex justify-center">
              <StarRating
                value={rating}
                size="lg"
                onRate={setRating}
              />
            </div>
          </div>
          <Textarea
            name="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={t("review.comment_placeholder")}
            className="dark:bg-slate-800 dark:border-slate-700"
          />
          <Button
            type="submit"
            size="lg"
            className="w-full text-white hover:opacity-90"
            style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (t("review.submitting_button") || "Submitting...") : t("review.submit_button")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

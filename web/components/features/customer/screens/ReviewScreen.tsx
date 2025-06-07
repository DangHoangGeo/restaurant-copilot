// web/components/features/customer/screens/ReviewScreen.tsx
"use client";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { RestaurantSettings } from "@/shared/types/customer";

interface ReviewScreenProps {
  setView: (v: string, props?: any) => void;
  restaurantSettings: RestaurantSettings;
  viewProps?: any;
  featureFlags: {
    advancedReviews: boolean;
  };
}

export function ReviewScreen({
  setView,
  restaurantSettings,
  viewProps,
}: ReviewScreenProps) {
  const t = useTranslations("Customer");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderId = viewProps?.orderId;
  const items = viewProps?.items || [];
  const currentItemIndex = viewProps?.currentItemIndex || 0;
  const currentItem = items[currentItemIndex];

  const handleSubmitReview = async () => {
    if (rating === 0) {
      alert(t("review.rating_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/reviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: currentItem.itemId || currentItem.id,
          orderId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Check if there are more items to review
        const nextIndex = currentItemIndex + 1;
        if (nextIndex < items.length) {
          // Move to next item
          setRating(0);
          setComment("");
          setView("review", {
            orderId,
            items,
            currentItemIndex: nextIndex,
          });
        } else {
          // All items reviewed, go to thank you
          setView("thankyou", { orderId, items });
        }
      } else {
        alert(data.error || t("review.submission_error"));
      }
    } catch (error) {
      console.error("Review submission error:", error);
      alert(t("review.submission_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipReview = () => {
    const nextIndex = currentItemIndex + 1;
    if (nextIndex < items.length) {
      setView("review", {
        orderId,
        items,
        currentItemIndex: nextIndex,
      });
    } else {
      setView("thankyou", { orderId, items });
    }
  };

  if (!currentItem) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center">
          <p>{t("review.no_items")}</p>
          <Button
            onClick={() => setView("thankyou", { orderId })}
            className="mt-4"
          >
            {t("review.back_to_thank_you")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-lg w-full p-6">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("thankyou", { orderId, items })}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold">
            {t("review.title")}
          </h2>
        </div>

        <div className="mb-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold mb-2">
              {currentItem.name || currentItem.itemName}
            </h3>
            <p className="text-sm text-gray-600">
              {t("review.item_progress", {
                current: currentItemIndex + 1,
                total: items.length,
              })}
            </p>
          </div>

          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 mb-3">
              {t("review.rating_prompt")}
            </p>
            <div className="flex justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-colors"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {t("review.comment_label")} ({t("review.optional")})
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("review.comment_placeholder")}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/500 {t("review.characters")}
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleSkipReview}
              className="flex-1"
              disabled={isSubmitting}
            >
              {t("review.skip_button")}
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={rating === 0 || isSubmitting}
              style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
              className="flex-1 text-white hover:opacity-90"
            >
              {isSubmitting
                ? t("review.submitting")
                : currentItemIndex + 1 < items.length
                ? t("review.next_item")
                : t("review.submit_button")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StarRatingInput from "@/components/shared/star-rating-input"; // Assuming this interactive component exists or will be created
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle } from "lucide-react";
import Link from "next/link";

interface ReviewFormProps {
  menuItemId: string;
  menuItemName: string; // Already localized
  restaurantPrimaryColor: string;
}

export default function ReviewForm({
  menuItemId,
  menuItemName,
  restaurantPrimaryColor,
}: ReviewFormProps) {
  const t = useTranslations("ReviewPage");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError(t("selectRatingError"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/reviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId, rating, comment }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details?.map((d:any)=>d.message).join(', ') || t("errorSubmittingReview"));
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Review submission failed:", err);
      setError(err.message || t("errorSubmittingReview"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTextColor = (bgColor: string): string => {
    const color = bgColor.startsWith("#") ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#ffffff";
  };
  const buttonTextColor = getTextColor(restaurantPrimaryColor);


  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center p-6 border rounded-lg shadow-lg">
        <CheckCircle className="mx-auto mb-4 h-16 w-16" style={{color: restaurantPrimaryColor}}/>
        <h2 className="text-2xl font-semibold mb-3">{t("reviewSubmittedTitle")}</h2>
        <p className="text-muted-foreground mb-6">{t("thankYouFeedback")}</p>
        <Button asChild style={{backgroundColor: restaurantPrimaryColor, color: buttonTextColor }}>
          <Link href={`/${locale}/customer`}>{t("backToMenuButton")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">
        {t("formTitle", { itemName: menuItemName })}
      </h1>
      <p className="text-muted-foreground text-center mb-6">{t("formSubtitle")}</p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{tCommon("alert.error.title")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
            {t("yourRatingLabel")}
          </label>
          {/*
            Assuming StarRatingInput is a client component that takes `rating` and `setRating`
            and visually represents stars that can be clicked.
            It should also handle accessibility.
          */}
          <StarRatingInput
            count={5}
            value={rating}
            onChange={setRating}
            size={30} // Example size
            activeColor={restaurantPrimaryColor}
            inactiveColor="#CBD5E0" // Example inactive color
          />
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
            {t("yourCommentLabel")}
          </label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            style={{backgroundColor: restaurantPrimaryColor, color: buttonTextColor }}
          >
            {isSubmitting ? tCommon("loading") : t("submitButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}

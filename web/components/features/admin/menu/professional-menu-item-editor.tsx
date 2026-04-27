"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  optimizeMenuImageFile,
  type OptimizedMenuImage,
} from "@/lib/client/menu-image-processing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PrimaryLanguage = "en" | "ja" | "vi";
type EditorMode = "organization-shared" | "branch";
type SizeKey = "S" | "M" | "L";

interface EditorCategory {
  id: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  itemCount: number;
}

interface ToppingDraft {
  id: string;
  originalName: string;
  price: string;
  translations: Record<PrimaryLanguage, string>;
}

interface SizeDraft {
  key: SizeKey;
  enabled: boolean;
  price: string;
}

interface ProfessionalMenuItemEditorProps {
  mode: EditorMode;
  branchId?: string;
  categories: EditorCategory[];
  locale: string;
  returnHref: string;
  restaurantName?: string | null;
}

const LANGUAGES: PrimaryLanguage[] = ["en", "ja", "vi"];

const SIZE_NAMES: Record<
  SizeKey,
  Record<PrimaryLanguage, string>
> = {
  S: { en: "Small", ja: "小サイズ", vi: "Nhỏ" },
  M: { en: "Medium", ja: "中サイズ", vi: "Vừa" },
  L: { en: "Large", ja: "大サイズ", vi: "Lớn" },
};

const SIZE_PERSISTENCE_ORDER: Record<SizeKey, number> = {
  M: 0,
  S: 1,
  L: 2,
};

function primaryLanguage(locale: string): PrimaryLanguage {
  if (locale.toLowerCase().startsWith("ja")) return "ja";
  if (locale.toLowerCase().startsWith("vi")) return "vi";
  return "en";
}

function emptyTranslations(): Record<PrimaryLanguage, string> {
  return { en: "", ja: "", vi: "" };
}

function localizedName(locale: string, value: EditorCategory) {
  const language = primaryLanguage(locale);
  const names =
    language === "ja"
      ? [value.name_ja, value.name_en, value.name_vi]
      : language === "vi"
        ? [value.name_vi, value.name_en, value.name_ja]
        : [value.name_en, value.name_ja, value.name_vi];
  return names.find((name) => Boolean(name?.trim())) ?? value.name_en;
}

function buildCopy(locale: string) {
  const language = primaryLanguage(locale);
  if (language === "ja") {
    return {
      title: "メニュー作成",
      steps: ["入力", "AI確認", "公開"],
      back: "戻る",
      next: "AIで確認",
      approve: "承認へ",
      publish: "公開",
      saving: "保存中...",
      generating: "確認中...",
      category: "カテゴリ",
      inputLanguage: "入力言語",
      originalName: "メニュー名",
      originalDescription: "説明・主な材料",
      price: "基本価格",
      active: "販売中",
      image: "画像",
      upload: "画像を選択",
      replace: "画像を変更",
      cropImage: "画像を調整",
      cropImageDescription: "顧客メニュー用に画像を切り抜き、軽量化します。",
      zoom: "ズーム",
      horizontal: "左右",
      vertical: "上下",
      applyImage: "画像を適用",
      sizes: "サイズ",
      useSizes: "サイズを使う",
      defaultSize: "標準",
      mediumRule: "通常価格はMediumに適用されます。",
      toppings: "トッピング",
      addTopping: "トッピング追加",
      toppingName: "名前",
      toppingPrice: "価格",
      aiNames: "AI提案タイトル",
      aiDescriptions: "AI提案説明",
      aiToppings: "トッピング翻訳",
      summary: "公開内容",
      required: "カテゴリ、メニュー名、説明、価格が必要です。",
      saved: "メニューを公開しました。",
      failed: "保存できませんでした。",
      english: "英語",
      japanese: "日本語",
      vietnamese: "ベトナム語",
    };
  }
  if (language === "vi") {
    return {
      title: "Tạo món",
      steps: ["Nhập", "AI duyệt", "Đăng bán"],
      back: "Quay lại",
      next: "Duyệt bằng AI",
      approve: "Duyệt để đăng",
      publish: "Đăng bán",
      saving: "Đang lưu...",
      generating: "Đang duyệt...",
      category: "Danh mục",
      inputLanguage: "Ngôn ngữ nhập",
      originalName: "Tên món",
      originalDescription: "Mô tả / nguyên liệu chính",
      price: "Giá cơ bản",
      active: "Đang bán",
      image: "Hình ảnh",
      upload: "Chọn ảnh",
      replace: "Đổi ảnh",
      cropImage: "Căn hình ảnh",
      cropImageDescription: "Cắt và nén hình để dùng nhanh trên menu khách hàng.",
      zoom: "Phóng to",
      horizontal: "Ngang",
      vertical: "Dọc",
      applyImage: "Dùng hình này",
      sizes: "Kích cỡ",
      useSizes: "Dùng kích cỡ",
      defaultSize: "Mặc định",
      mediumRule: "Giá gốc luôn áp dụng cho size Medium.",
      toppings: "Topping",
      addTopping: "Thêm topping",
      toppingName: "Tên",
      toppingPrice: "Giá",
      aiNames: "Tên AI đề xuất",
      aiDescriptions: "Mô tả AI đề xuất",
      aiToppings: "Dịch topping",
      summary: "Nội dung đăng bán",
      required: "Cần danh mục, tên món, mô tả và giá.",
      saved: "Đã đăng bán món.",
      failed: "Không thể lưu.",
      english: "Tiếng Anh",
      japanese: "Tiếng Nhật",
      vietnamese: "Tiếng Việt",
    };
  }
  return {
    title: "Create menu item",
    steps: ["Input", "AI review", "Publish"],
    back: "Back",
    next: "Review with AI",
    approve: "Approve",
    publish: "Publish",
    saving: "Saving...",
    generating: "Reviewing...",
    category: "Category",
    inputLanguage: "Input language",
    originalName: "Item name",
    originalDescription: "Description / main ingredients",
    price: "Base price",
    active: "Available",
    image: "Image",
    upload: "Choose image",
    replace: "Replace image",
    cropImage: "Crop image",
    cropImageDescription: "Crop and compress the image for the customer menu.",
    zoom: "Zoom",
    horizontal: "Horizontal",
    vertical: "Vertical",
    applyImage: "Use image",
    sizes: "Sizes",
    useSizes: "Use sizes",
    defaultSize: "Default",
    mediumRule: "The original item price always applies to Medium.",
    toppings: "Toppings",
    addTopping: "Add topping",
    toppingName: "Name",
    toppingPrice: "Price",
    aiNames: "AI-reviewed titles",
    aiDescriptions: "AI-reviewed descriptions",
    aiToppings: "Topping translations",
    summary: "Publish summary",
    required: "Category, item name, description, and price are required.",
    saved: "Menu item published.",
    failed: "Could not save.",
    english: "English",
    japanese: "Japanese",
    vietnamese: "Vietnamese",
  };
}

function languageLabel(copy: ReturnType<typeof buildCopy>, language: PrimaryLanguage) {
  if (language === "ja") return copy.japanese;
  if (language === "vi") return copy.vietnamese;
  return copy.english;
}

function orderedLanguages(primary: PrimaryLanguage): PrimaryLanguage[] {
  return [primary, ...LANGUAGES.filter((language) => language !== primary)];
}

function optionId() {
  return crypto.randomUUID();
}

function initialSizes(): SizeDraft[] {
  return [
    { key: "S", enabled: false, price: "" },
    { key: "M", enabled: true, price: "" },
    { key: "L", enabled: false, price: "" },
  ];
}

export function ProfessionalMenuItemEditor({
  mode,
  branchId,
  categories,
  locale,
  returnHref,
  restaurantName,
}: ProfessionalMenuItemEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const copy = useMemo(() => buildCopy(locale), [locale]);
  const originalLanguage = primaryLanguage(locale);
  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [originalName, setOriginalName] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [useSizes, setUseSizes] = useState(false);
  const [sizes, setSizes] = useState<SizeDraft[]>(initialSizes);
  const [toppings, setToppings] = useState<ToppingDraft[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<OptimizedMenuImage | null>(null);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reviewNames, setReviewNames] = useState(emptyTranslations);
  const [reviewDescriptions, setReviewDescriptions] = useState(emptyTranslations);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectedSizes = useSizes
    ? sizes.filter((size) => size.enabled || size.key === "M")
        .sort(
          (a, b) => SIZE_PERSISTENCE_ORDER[a.key] - SIZE_PERSISTENCE_ORDER[b.key],
        )
    : [];

  const updateSize = (key: SizeKey, patch: Partial<SizeDraft>) => {
    setSizes((current) =>
      current.map((size) => (size.key === key ? { ...size, ...patch } : size)),
    );
  };

  const addTopping = () => {
    setToppings((current) => [
      ...current,
      {
        id: optionId(),
        originalName: "",
        price: "0",
        translations: emptyTranslations(),
      },
    ]);
  };

  const updateTopping = (id: string, patch: Partial<ToppingDraft>) => {
    setToppings((current) =>
      current.map((topping) =>
        topping.id === id ? { ...topping, ...patch } : topping,
      ),
    );
  };

  const removeTopping = (id: string) => {
    setToppings((current) => current.filter((topping) => topping.id !== id));
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(copy.failed);
      event.target.value = "";
      return;
    }

    if (sourceImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(sourceImagePreview);
    }
    setSourceImageFile(file);
    setSourceImagePreview(URL.createObjectURL(file));
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setIsCropDialogOpen(true);
    event.target.value = "";
  };

  const applyImageCrop = async () => {
    if (!sourceImageFile) return;
    setIsProcessingImage(true);
    try {
      const optimized = await optimizeMenuImageFile(sourceImageFile, {
        zoom: cropZoom,
        offsetX: cropOffsetX,
        offsetY: cropOffsetY,
      });
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
      setImageFile(optimized.file);
      setImagePreview(optimized.previewUrl);
      setImageInfo(optimized);
      setIsCropDialogOpen(false);
    } catch {
      toast.error(copy.failed);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const validateInput = () => {
    if (
      !categoryId ||
      !originalName.trim() ||
      !originalDescription.trim() ||
      price.trim() === "" ||
      Number(price) < 0
    ) {
      toast.error(copy.required);
      return false;
    }
    return true;
  };

  const translateTopping = async (value: string) => {
    const response = await fetch("/api/v1/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: value,
        field: "name",
        context: "topping",
      }),
    });
    if (!response.ok) throw new Error(copy.failed);
    return response.json() as Promise<Record<PrimaryLanguage, string>>;
  };

  const handleAIReview = async () => {
    if (!validateInput()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/v1/ai/generate-menu-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: originalName,
          existingDescription: originalDescription,
          language: originalLanguage,
          restaurantName,
          restaurantDescription: selectedCategory
            ? localizedName(locale, selectedCategory)
            : "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? copy.failed);

      setReviewNames({
        en: data.name_en || (originalLanguage === "en" ? originalName : originalName),
        ja: data.name_ja || (originalLanguage === "ja" ? originalName : originalName),
        vi: data.name_vi || (originalLanguage === "vi" ? originalName : originalName),
      });
      setReviewDescriptions({
        en:
          data.description_en ||
          (originalLanguage === "en" ? originalDescription : originalDescription),
        ja:
          data.description_ja ||
          (originalLanguage === "ja" ? originalDescription : originalDescription),
        vi:
          data.description_vi ||
          (originalLanguage === "vi" ? originalDescription : originalDescription),
      });

      const translatedToppings = await Promise.all(
        toppings.map(async (topping) => {
          if (!topping.originalName.trim()) return topping;
          try {
            const translations = await translateTopping(topping.originalName);
            return {
              ...topping,
              translations: {
                en: translations.en || topping.originalName,
                ja: translations.ja || topping.originalName,
                vi: translations.vi || topping.originalName,
              },
            };
          } catch {
            return {
              ...topping,
              translations: {
                en: topping.originalName,
                ja: topping.originalName,
                vi: topping.originalName,
              },
            };
          }
        }),
      );
      setToppings(translatedToppings);
      setStep(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    } finally {
      setIsGenerating(false);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    const sessionResponse = await fetch("/api/v1/auth/session");
    const sessionData = await sessionResponse.json();
    if (!sessionData.authenticated) throw new Error("User not authenticated");
    const uploadScope = branchId ?? sessionData.user?.restaurantId ?? "shared-menu";
    const filePath = `restaurants/${uploadScope}/menu_items/${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage
      .from("restaurant-uploads")
      .upload(filePath, imageFile, { cacheControl: "3600", upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from("restaurant-uploads").getPublicUrl(filePath).data.publicUrl;
  };

  const handleSave = async () => {
    if (!validateInput()) return;
    if (!reviewNames.en.trim()) {
      toast.error(copy.required);
      return;
    }

    setIsSaving(true);
    try {
      const imageUrl = await uploadImage();
      const payload = {
        category_id: categoryId,
        name_en: reviewNames.en.trim(),
        name_ja: reviewNames.ja.trim(),
        name_vi: reviewNames.vi.trim(),
        description_en: reviewDescriptions.en.trim(),
        description_ja: reviewDescriptions.ja.trim(),
        description_vi: reviewDescriptions.vi.trim(),
        price: Number(price),
        image_url: imageUrl,
        available,
        weekday_visibility: [1, 2, 3, 4, 5, 6, 7],
        position: selectedCategory?.itemCount ?? 0,
        sizes: selectedSizes.map((size, index) => ({
          size_key: size.key,
          name_en: SIZE_NAMES[size.key].en,
          name_ja: SIZE_NAMES[size.key].ja,
          name_vi: SIZE_NAMES[size.key].vi,
          price: Number((size.key === "M" ? price : size.price) || price || 0),
          position: index,
        })),
        toppings: toppings
          .filter((topping) => topping.originalName.trim())
          .map((topping, index) => ({
            name_en: topping.translations.en || topping.originalName,
            name_ja: topping.translations.ja || topping.originalName,
            name_vi: topping.translations.vi || topping.originalName,
            price: Number(topping.price || 0),
            position: index,
          })),
      };

      const response =
        mode === "organization-shared"
          ? await fetch("/api/v1/owner/organization/shared-menu", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "item", ...payload }),
            })
          : await fetch(
              `/api/v1/owner/menu/menu-items?branchId=${encodeURIComponent(branchId ?? "")}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
            );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? data.message ?? copy.failed);
      toast.success(copy.saved);
      router.push(returnHref);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4 text-[#2E2117] dark:text-[#F7F1E9]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="mb-2 rounded-lg text-[#8B6E5A] hover:bg-[#F5EAD8] hover:text-[#2E2117] dark:text-[#C9B7A0] dark:hover:bg-[#332116] dark:hover:text-[#F7F1E9]"
            onClick={() => router.push(returnHref)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {copy.back}
          </Button>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {copy.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {copy.steps.map((label, index) => (
            <Badge
              key={label}
              className={cn(
                "rounded-md border px-3 py-1",
                index === step
                  ? "border-[#AB6E3C]/35 bg-[#AB6E3C] text-white hover:bg-[#AB6E3C] dark:border-[#F1DCC4]/20 dark:bg-[#F1DCC4] dark:text-[#170F0C] dark:hover:bg-[#F1DCC4]"
                  : "border-[#AB6E3C]/14 bg-[#FFF7E9] text-[#8B6E5A] hover:bg-[#FFF7E9] dark:border-[#F1DCC4]/12 dark:bg-[#2B1A10] dark:text-[#C9B7A0]",
              )}
            >
              {index + 1}. {label}
            </Badge>
          ))}
        </div>
      </div>

      {step === 0 ? (
        <InputStep
          copy={copy}
          locale={locale}
          categories={categories}
          selectedCategory={selectedCategory}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          originalLanguage={originalLanguage}
          originalName={originalName}
          setOriginalName={setOriginalName}
          originalDescription={originalDescription}
          setOriginalDescription={setOriginalDescription}
          price={price}
          setPrice={setPrice}
          available={available}
          setAvailable={setAvailable}
          useSizes={useSizes}
          setUseSizes={setUseSizes}
          sizes={sizes}
          updateSize={updateSize}
          toppings={toppings}
          addTopping={addTopping}
          updateTopping={updateTopping}
          removeTopping={removeTopping}
          imageFile={imageFile}
          imagePreview={imagePreview}
          imageInfo={imageInfo}
          handleImageSelect={handleImageSelect}
          isGenerating={isGenerating}
          handleAIReview={handleAIReview}
        />
      ) : null}

      {step === 1 ? (
        <ReviewStep
          copy={copy}
          displayLanguage={originalLanguage}
          reviewNames={reviewNames}
          setReviewNames={setReviewNames}
          reviewDescriptions={reviewDescriptions}
          setReviewDescriptions={setReviewDescriptions}
          toppings={toppings}
          updateTopping={updateTopping}
          onBack={() => setStep(0)}
          onApprove={() => setStep(2)}
        />
      ) : null}

      {step === 2 ? (
        <PublishStep
          copy={copy}
          displayLanguage={originalLanguage}
          categoryName={selectedCategory ? localizedName(locale, selectedCategory) : ""}
          reviewNames={reviewNames}
          reviewDescriptions={reviewDescriptions}
          price={price}
          available={available}
          useSizes={useSizes}
          sizes={selectedSizes}
          toppings={toppings}
          imagePreview={imagePreview}
          onBack={() => setStep(1)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      ) : null}

      <ImageCropDialog
        copy={copy}
        open={isCropDialogOpen}
        onOpenChange={setIsCropDialogOpen}
        sourceImagePreview={sourceImagePreview}
        cropZoom={cropZoom}
        setCropZoom={setCropZoom}
        cropOffsetX={cropOffsetX}
        setCropOffsetX={setCropOffsetX}
        cropOffsetY={cropOffsetY}
        setCropOffsetY={setCropOffsetY}
        isProcessingImage={isProcessingImage}
        onApply={applyImageCrop}
      />
    </section>
  );
}

function InputStep(props: {
  copy: ReturnType<typeof buildCopy>;
  locale: string;
  categories: EditorCategory[];
  selectedCategory?: EditorCategory;
  categoryId: string;
  setCategoryId: (value: string) => void;
  originalLanguage: PrimaryLanguage;
  originalName: string;
  setOriginalName: (value: string) => void;
  originalDescription: string;
  setOriginalDescription: (value: string) => void;
  price: string;
  setPrice: (value: string) => void;
  available: boolean;
  setAvailable: (value: boolean) => void;
  useSizes: boolean;
  setUseSizes: (value: boolean) => void;
  sizes: SizeDraft[];
  updateSize: (key: SizeKey, patch: Partial<SizeDraft>) => void;
  toppings: ToppingDraft[];
  addTopping: () => void;
  updateTopping: (id: string, patch: Partial<ToppingDraft>) => void;
  removeTopping: (id: string) => void;
  imageFile: File | null;
  imagePreview: string | null;
  imageInfo: OptimizedMenuImage | null;
  handleImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  isGenerating: boolean;
  handleAIReview: () => void;
}) {
  const { copy } = props;
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
          <div className="flex items-center justify-between gap-3 border-b border-[#AB6E3C]/12 bg-[#F5EAD8]/64 px-4 py-3 dark:border-[#F1DCC4]/10 dark:bg-[#2B1A10]/70">
            <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
              {copy.category}
            </h2>
            <Badge className="rounded-md border border-[#AB6E3C]/14 bg-[#FEFAF6] text-[#6F4D35] hover:bg-[#FEFAF6] dark:border-[#F1DCC4]/12 dark:bg-[#170F0C] dark:text-[#F1DCC4]">
              {props.categories.length}
            </Badge>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {props.categories.map((category) => {
              const isSelected = props.categoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-[#2E2117] text-[#FFF7E9] dark:bg-[#F1DCC4] dark:text-[#170F0C]"
                      : "text-[#2E2117] hover:bg-[#F5EAD8] dark:text-[#F7F1E9] dark:hover:bg-[#332116]",
                  )}
                  onClick={() => props.setCategoryId(category.id)}
                >
                  <span className="min-w-0 truncate font-medium">
                    {localizedName(props.locale, category)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-0.5 text-xs",
                      isSelected
                        ? "border-[#FFF7E9]/20 text-[#FFF7E9] dark:border-[#170F0C]/20 dark:text-[#170F0C]"
                        : "border-[#AB6E3C]/14 text-[#8B6E5A] dark:border-[#F1DCC4]/12 dark:text-[#C9B7A0]",
                    )}
                  >
                    {category.itemCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
          <div className="rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] px-3 py-3 text-sm dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]">
            <span className="text-[#8B6E5A] dark:text-[#C9B7A0]">
              {copy.inputLanguage}
            </span>
            <p className="mt-1 font-medium text-[#2E2117] dark:text-[#F7F1E9]">
              {languageLabel(copy, props.originalLanguage)}
            </p>
          </div>

          <label className="mt-3 flex items-center justify-between rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] px-3 py-3 text-sm font-medium text-[#2E2117] dark:border-[#F1DCC4]/10 dark:bg-[#170F0C] dark:text-[#F7F1E9]">
            <span>{copy.active}</span>
            <Switch checked={props.available} onCheckedChange={props.setAvailable} />
          </label>
        </div>

        <ImagePanel
          copy={copy}
          imageFile={props.imageFile}
          imagePreview={props.imagePreview}
          imageInfo={props.imageInfo}
          handleImageSelect={props.handleImageSelect}
        />
      </aside>

      <div className="space-y-4">
        <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
          <label className="space-y-2 text-sm font-medium text-[#2E2117] dark:text-[#F7F1E9]">
            <span>{copy.originalName}</span>
            <Input
              value={props.originalName}
              onChange={(event) => props.setOriginalName(event.target.value)}
              className="h-11 rounded-xl border-[#AB6E3C]/18 bg-[#FEFAF6] text-[#2E2117] focus-visible:ring-[#AB6E3C]/25 dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9]"
            />
          </label>
          <label className="mt-4 block space-y-2 text-sm font-medium text-[#2E2117] dark:text-[#F7F1E9]">
            <span>{copy.originalDescription}</span>
            <Textarea
              value={props.originalDescription}
              onChange={(event) => props.setOriginalDescription(event.target.value)}
              rows={5}
              className="min-h-32 rounded-xl border-[#AB6E3C]/18 bg-[#FEFAF6] text-[#2E2117] focus-visible:ring-[#AB6E3C]/25 dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9]"
            />
          </label>
        </div>

        <ToppingInputPanel
          copy={copy}
          toppings={props.toppings}
          addTopping={props.addTopping}
          updateTopping={props.updateTopping}
          removeTopping={props.removeTopping}
        />

        <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
          <label className="block space-y-2 text-sm font-medium text-[#2E2117] dark:text-[#F7F1E9]">
            <span>{copy.price}</span>
            <Input
              type="number"
              min="0"
              value={props.price}
              onChange={(event) => props.setPrice(event.target.value)}
              className="h-10 rounded-xl border-[#AB6E3C]/18 bg-[#FEFAF6] text-[#2E2117] focus-visible:ring-[#AB6E3C]/25 dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9]"
            />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#AB6E3C]/12 pt-4 dark:border-[#F1DCC4]/10">
            <div>
              <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
                {copy.sizes}
              </h2>
              <p className="mt-1 text-xs text-[#8B6E5A] dark:text-[#C9B7A0]">
                {copy.mediumRule}
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm font-medium">
              <span>{copy.useSizes}</span>
              <Switch checked={props.useSizes} onCheckedChange={props.setUseSizes} />
            </label>
          </div>
          {props.useSizes ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {props.sizes.map((size) => (
                <div
                  key={size.key}
                  className="rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-3 dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]"
                >
                  <label className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span>
                      {size.key} · {SIZE_NAMES[size.key][props.originalLanguage]}
                    </span>
                    {size.key === "M" ? (
                      <Badge className="rounded-md border border-[#AB6E3C]/20 bg-[#F5EAD8] text-[#6F4D35] dark:border-[#F1DCC4]/12 dark:bg-[#2B1A10] dark:text-[#F1DCC4]">
                        {copy.defaultSize}
                      </Badge>
                    ) : (
                      <Switch
                        checked={size.enabled}
                        onCheckedChange={(checked) =>
                          props.updateSize(size.key, { enabled: checked })
                        }
                      />
                    )}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={size.key === "M" ? props.price : size.price}
                    disabled={size.key === "M"}
                    onChange={(event) =>
                      props.updateSize(size.key, { price: event.target.value })
                    }
                    className="mt-3 h-9 rounded-xl border-[#AB6E3C]/18 bg-[#FFF7E9] text-[#2E2117] disabled:opacity-70 dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9]"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            className="rounded-xl bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/20 hover:bg-[#965B2E] dark:bg-[#C8773E] dark:hover:bg-[#D4894E]"
            onClick={props.handleAIReview}
            disabled={props.isGenerating}
          >
            {props.isGenerating ? (
              <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
            ) : (
              <WandSparkles className="mr-2 h-4 w-4" />
            )}
            {props.isGenerating ? copy.generating : copy.next}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  copy,
  displayLanguage,
  reviewNames,
  setReviewNames,
  reviewDescriptions,
  setReviewDescriptions,
  toppings,
  updateTopping,
  onBack,
  onApprove,
}: {
  copy: ReturnType<typeof buildCopy>;
  displayLanguage: PrimaryLanguage;
  reviewNames: Record<PrimaryLanguage, string>;
  setReviewNames: Dispatch<SetStateAction<Record<PrimaryLanguage, string>>>;
  reviewDescriptions: Record<PrimaryLanguage, string>;
  setReviewDescriptions: Dispatch<SetStateAction<Record<PrimaryLanguage, string>>>;
  toppings: ToppingDraft[];
  updateTopping: (id: string, patch: Partial<ToppingDraft>) => void;
  onBack: () => void;
  onApprove: () => void;
}) {
  return (
    <div className="space-y-4">
      <LocalizedFieldsPanel
        title={copy.aiNames}
        values={reviewNames}
        setValues={setReviewNames}
        copy={copy}
        languages={orderedLanguages(displayLanguage)}
        rows={2}
      />
      <LocalizedFieldsPanel
        title={copy.aiDescriptions}
        values={reviewDescriptions}
        setValues={setReviewDescriptions}
        copy={copy}
        languages={orderedLanguages(displayLanguage)}
        rows={5}
      />
      {toppings.length > 0 ? (
        <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
          <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
            {copy.aiToppings}
          </h2>
          <div className="mt-3 space-y-3">
            {toppings.map((topping) => (
              <div
                key={topping.id}
                className="rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-3 dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]"
              >
                <div className="grid gap-2 lg:grid-cols-3">
                  {orderedLanguages(displayLanguage).map((language) => (
                    <label key={language} className="space-y-2 text-sm font-medium">
                      <span>{languageLabel(copy, language)}</span>
                      <Input
                        value={topping.translations[language]}
                        onChange={(event) =>
                          updateTopping(topping.id, {
                            translations: {
                              ...topping.translations,
                              [language]: event.target.value,
                            },
                          })
                        }
                        className="h-10 rounded-xl border-[#AB6E3C]/18 bg-[#FFF7E9] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9]"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-[#AB6E3C]/20 bg-[#FFF7E9]/80 text-[#6F4D35] hover:bg-[#F5EAD8] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
          onClick={onBack}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {copy.back}
        </Button>
        <Button
          type="button"
          className="rounded-xl bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/20 hover:bg-[#965B2E] dark:bg-[#C8773E] dark:hover:bg-[#D4894E]"
          onClick={onApprove}
        >
          <Check className="mr-2 h-4 w-4" />
          {copy.approve}
        </Button>
      </div>
    </div>
  );
}

function PublishStep({
  copy,
  displayLanguage,
  categoryName,
  reviewNames,
  reviewDescriptions,
  price,
  available,
  useSizes,
  sizes,
  toppings,
  imagePreview,
  onBack,
  onSave,
  isSaving,
}: {
  copy: ReturnType<typeof buildCopy>;
  displayLanguage: PrimaryLanguage;
  categoryName: string;
  reviewNames: Record<PrimaryLanguage, string>;
  reviewDescriptions: Record<PrimaryLanguage, string>;
  price: string;
  available: boolean;
  useSizes: boolean;
  sizes: SizeDraft[];
  toppings: ToppingDraft[];
  imagePreview: string | null;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
        <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
          {copy.summary}
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <div className="rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-3 dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]">
              <p className="text-xs text-[#8B6E5A] dark:text-[#C9B7A0]">
                {copy.category}
              </p>
              <p className="mt-1 font-medium">{categoryName}</p>
            </div>
            <div className="rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-3 dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]">
              <p className="text-xs text-[#8B6E5A] dark:text-[#C9B7A0]">
                {copy.price}
              </p>
              <p className="mt-1 font-medium">{price}</p>
            </div>
            <div className="rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-3 dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]">
              <p className="text-xs text-[#8B6E5A] dark:text-[#C9B7A0]">
                {copy.active}
              </p>
              <p className="mt-1 font-medium">{available ? copy.active : "-"}</p>
            </div>
            {imagePreview ? (
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}
          </div>
          <div className="space-y-3">
            {orderedLanguages(displayLanguage).map((language) => (
              <div
                key={language}
                className="rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-3 dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]"
              >
                <p className="text-xs text-[#8B6E5A] dark:text-[#C9B7A0]">
                  {languageLabel(copy, language)}
                </p>
                <p className="mt-1 font-semibold">{reviewNames[language]}</p>
                <p className="mt-2 text-sm leading-5 text-[#6F4D35] dark:text-[#F1DCC4]">
                  {reviewDescriptions[language]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {useSizes ? (
          <SummaryList
            title={copy.sizes}
            rows={sizes.map((size) => ({
              label: `${size.key} · ${SIZE_NAMES[size.key][displayLanguage]}`,
              value: size.key === "M" ? price : size.price,
            }))}
          />
        ) : null}
        {toppings.length > 0 ? (
          <SummaryList
            title={copy.toppings}
            rows={toppings
              .filter((topping) => topping.originalName.trim())
              .map((topping) => ({
                label:
                  topping.translations[displayLanguage] ||
                  topping.translations.en ||
                  topping.originalName,
                value: topping.price,
              }))}
          />
        ) : null}
      </div>

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-[#AB6E3C]/20 bg-[#FFF7E9]/80 text-[#6F4D35] hover:bg-[#F5EAD8] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
          onClick={onBack}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {copy.back}
        </Button>
        <Button
          type="button"
          className="rounded-xl bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/20 hover:bg-[#965B2E] dark:bg-[#C8773E] dark:hover:bg-[#D4894E]"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? copy.saving : copy.publish}
        </Button>
      </div>
    </div>
  );
}

function LocalizedFieldsPanel({
  title,
  values,
  setValues,
  copy,
  languages,
  rows,
}: {
  title: string;
  values: Record<PrimaryLanguage, string>;
  setValues: Dispatch<SetStateAction<Record<PrimaryLanguage, string>>>;
  copy: ReturnType<typeof buildCopy>;
  languages: PrimaryLanguage[];
  rows: number;
}) {
  return (
    <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
      <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
        {title}
      </h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {languages.map((language) => (
          <label key={language} className="space-y-2 text-sm font-medium">
            <span>{languageLabel(copy, language)}</span>
            <Textarea
              value={values[language]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [language]: event.target.value,
                }))
              }
              rows={rows}
              className="rounded-xl border-[#AB6E3C]/18 bg-[#FEFAF6] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9]"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ImagePanel({
  copy,
  imageFile,
  imagePreview,
  imageInfo,
  handleImageSelect,
}: {
  copy: ReturnType<typeof buildCopy>;
  imageFile: File | null;
  imagePreview: string | null;
  imageInfo: OptimizedMenuImage | null;
  handleImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
          {copy.image}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex aspect-[4/3] w-28 items-center justify-center overflow-hidden rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]">
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-7 w-7 text-[#8B6E5A] dark:text-[#C9B7A0]" />
          )}
        </div>
        <label className="cursor-pointer">
          <span className="inline-flex h-10 items-center rounded-xl border border-[#AB6E3C]/20 bg-[#FEFAF6] px-4 text-sm font-medium text-[#6F4D35] hover:bg-[#F5EAD8] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]">
            {imageFile ? copy.replace : copy.upload}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageSelect}
          />
        </label>
      </div>
      {imageInfo ? <div className="mt-3 h-1 rounded-full bg-[#AB6E3C]/70" /> : null}
    </div>
  );
}

function ImageCropDialog({
  copy,
  open,
  onOpenChange,
  sourceImagePreview,
  cropZoom,
  setCropZoom,
  cropOffsetX,
  setCropOffsetX,
  cropOffsetY,
  setCropOffsetY,
  isProcessingImage,
  onApply,
}: {
  copy: ReturnType<typeof buildCopy>;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  sourceImagePreview: string | null;
  cropZoom: number;
  setCropZoom: (value: number) => void;
  cropOffsetX: number;
  setCropOffsetX: (value: number) => void;
  cropOffsetY: number;
  setCropOffsetY: (value: number) => void;
  isProcessingImage: boolean;
  onApply: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#AB6E3C]/15 bg-[#FFF7E9] text-[#2E2117] dark:border-[#F1DCC4]/12 dark:bg-[#170F0C] dark:text-[#F7F1E9] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy.cropImage}</DialogTitle>
          <DialogDescription className="text-[#8B6E5A] dark:text-[#C9B7A0]">
            {copy.cropImageDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-3 dark:border-[#F1DCC4]/10 dark:bg-[#251810]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#AB6E3C]/20 bg-[#F5EAD8] dark:border-[#F1DCC4]/14 dark:bg-[#120C08]">
              {sourceImagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sourceImagePreview}
                  alt=""
                  className="absolute object-cover"
                  style={{
                    width: `${100 * cropZoom}%`,
                    height: `${100 * cropZoom}%`,
                    left: `${50 + cropOffsetX * 0.35}%`,
                    top: `${50 + cropOffsetY * 0.35}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#8B6E5A] dark:text-[#C9B7A0]">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 border border-white/45 dark:border-white/30" />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-4 dark:border-[#F1DCC4]/10 dark:bg-[#251810]">
            <RangeControl
              label={copy.zoom}
              min={1}
              max={3}
              step={0.05}
              value={cropZoom}
              onChange={setCropZoom}
            />
            <RangeControl
              label={copy.horizontal}
              min={-100}
              max={100}
              step={1}
              value={cropOffsetX}
              onChange={setCropOffsetX}
            />
            <RangeControl
              label={copy.vertical}
              min={-100}
              max={100}
              step={1}
              value={cropOffsetY}
              onChange={setCropOffsetY}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            className="rounded-xl bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/20 hover:bg-[#965B2E] dark:bg-[#C8773E] dark:hover:bg-[#D4894E]"
            onClick={onApply}
            disabled={!sourceImagePreview || isProcessingImage}
          >
            {isProcessingImage ? copy.saving : copy.applyImage}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RangeControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-xs text-[#8B6E5A] dark:text-[#C9B7A0]">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[#AB6E3C]"
      />
    </label>
  );
}


function ToppingInputPanel({
  copy,
  toppings,
  addTopping,
  updateTopping,
  removeTopping,
}: {
  copy: ReturnType<typeof buildCopy>;
  toppings: ToppingDraft[];
  addTopping: () => void;
  updateTopping: (id: string, patch: Partial<ToppingDraft>) => void;
  removeTopping: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
          {copy.toppings}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl border-[#AB6E3C]/20 bg-[#FEFAF6] text-[#6F4D35] hover:bg-[#F5EAD8] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
          onClick={addTopping}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {copy.addTopping}
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        {toppings.map((topping) => (
          <div
            key={topping.id}
            className="rounded-xl border border-[#AB6E3C]/12 bg-[#FEFAF6] p-3 dark:border-[#F1DCC4]/10 dark:bg-[#170F0C]"
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_0.45fr_auto]">
              <Input
                value={topping.originalName}
                placeholder={copy.toppingName}
                onChange={(event) =>
                  updateTopping(topping.id, { originalName: event.target.value })
                }
                className="h-9 rounded-xl border-[#AB6E3C]/18 bg-[#FFF7E9] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9]"
              />
              <Input
                value={topping.price}
                type="number"
                min="0"
                placeholder={copy.toppingPrice}
                onChange={(event) =>
                  updateTopping(topping.id, { price: event.target.value })
                }
                className="h-9 rounded-xl border-[#AB6E3C]/18 bg-[#FFF7E9] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-md text-red-200 hover:bg-red-500/10"
                onClick={() => removeTopping(topping.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-4 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
      <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
        {title}
      </h2>
      <div className="mt-3 divide-y divide-[#AB6E3C]/10 rounded-xl border border-[#AB6E3C]/12 dark:divide-[#F1DCC4]/10 dark:border-[#F1DCC4]/10">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 px-3 py-2 text-sm">
            <span>{row.label}</span>
            <span className="text-[#6F4D35] dark:text-[#F1DCC4]">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

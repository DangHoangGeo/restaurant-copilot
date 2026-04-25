"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Languages,
  Plus,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { optimizeMenuImageFile } from "@/lib/client/menu-image-processing";

type PrimaryLanguage = "en" | "ja" | "vi";

interface WizardCategory {
  id: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  source: "organization" | "branch";
  itemCount: number;
}

interface LocalizedFields {
  en: string;
  ja: string;
  vi: string;
}

interface OptionDraft {
  id: string;
  baseName: string;
  basePrice: string;
  sizeKey?: string;
  translations: LocalizedFields;
}

interface MenuItemCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "branch" | "organization-shared";
  branchId?: string;
  categories: WizardCategory[];
  ownerLanguage: PrimaryLanguage;
  locale: string;
  organizationName?: string | null;
  branchName?: string | null;
  onCreated: () => Promise<void> | void;
}

const SIZE_KEY_NAMES: Record<string, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra Large",
};

function createEmptyTranslations(): LocalizedFields {
  return { en: "", ja: "", vi: "" };
}

function localeToLanguage(locale: string): PrimaryLanguage {
  const normalizedLocale = locale.toLowerCase();
  if (normalizedLocale.startsWith("ja")) return "ja";
  if (normalizedLocale.startsWith("vi")) return "vi";
  return "en";
}

function orderedLanguages(primaryLanguage: PrimaryLanguage): PrimaryLanguage[] {
  return [
    primaryLanguage,
    ...(["en", "ja", "vi"] as const).filter(
      (language) => language !== primaryLanguage,
    ),
  ];
}

function buildLocaleCopy(locale: string) {
  const language = localeToLanguage(locale);

  if (language === "ja") {
    return {
      title: "新しいメニュー",
      steps: ["入力", "確認", "保存"],
      primaryLanguage: "入力言語",
      category: "カテゴリ",
      itemName: "メニュー名",
      descriptionLabel: "短い説明",
      price: "基本価格",
      image: "画像",
      uploadImage: "画像をアップロード",
      changeImage: "画像を変更",
      sizes: "サイズ",
      toppings: "トッピング",
      addSize: "サイズを追加",
      addTopping: "トッピングを追加",
      optionName: "名前",
      optionPrice: "価格",
      sizePrice: "価格",
      generate: "AIで確認",
      generating: "確認中...",
      back: "戻る",
      continue: "次へ",
      save: "保存",
      saving: "保存中...",
      reviewTitle: "言語レビュー",
      confirmTitle: "保存内容",
      companyManaged: "会社のカテゴリ",
      branchManaged: "支店カテゴリ",
      requiredMessage: "カテゴリ、メニュー名、価格は必須です。",
      generatedMessage: "AIが3言語の下書きを作成しました。",
      savedMessage: "メニューを追加しました。",
      aiDescriptionPlaceholder: "例: 牛肉、米麺、香味野菜、透明感のあるスープ",
      itemPlaceholder: "例: 牛肉フォー、抹茶ラテ、揚げ春巻き",
      optionPlaceholder: "例: チーズ、追加卵",
      standardSizes: "S / M / L を追加",
      emptySizes: "サイズなし",
      emptyToppings: "トッピングなし",
      selectedLanguage: "選択言語",
      categoryItems: "登録済み",
      imageTooLarge: "画像は5MB以下にしてください。",
      sharedTitle: "共有メニューを追加",
      sharedSavedMessage: "共有メニューを追加しました。",
      sharedScopeTitle: "会社の共有メニュー",
      sharedScopeDescription: "保存後、継承対象の支店メニューへ同期されます。",
    };
  }

  if (language === "vi") {
    return {
      title: "Món mới",
      steps: ["Nhập", "Duyệt", "Lưu"],
      primaryLanguage: "Ngôn ngữ nhập",
      category: "Danh mục",
      itemName: "Tên món",
      descriptionLabel: "Mô tả ngắn",
      price: "Giá cơ bản",
      image: "Hình ảnh",
      uploadImage: "Tải ảnh lên",
      changeImage: "Đổi ảnh",
      sizes: "Size",
      toppings: "Topping",
      addSize: "Thêm size",
      addTopping: "Thêm topping",
      optionName: "Tên",
      optionPrice: "Giá cộng thêm",
      sizePrice: "Giá",
      generate: "Duyệt bằng AI",
      generating: "Đang duyệt...",
      back: "Quay lại",
      continue: "Tiếp tục",
      save: "Lưu",
      saving: "Đang lưu...",
      reviewTitle: "Duyệt ngôn ngữ",
      confirmTitle: "Nội dung lưu",
      companyManaged: "Danh mục công ty",
      branchManaged: "Danh mục chi nhánh",
      requiredMessage: "Danh mục, tên món và giá là bắt buộc.",
      generatedMessage: "AI đã tạo bản nháp 3 ngôn ngữ.",
      savedMessage: "Đã thêm món mới.",
      aiDescriptionPlaceholder:
        "Ví dụ: bò thái lát, bánh phở, rau thơm, nước dùng trong",
      itemPlaceholder: "Ví dụ: Pho bò, Matcha latte, Chả giò chiên",
      optionPlaceholder: "Ví dụ: phô mai, thêm trứng",
      standardSizes: "Thêm S / M / L",
      emptySizes: "Chưa có size",
      emptyToppings: "Chưa có topping",
      selectedLanguage: "Ngôn ngữ chọn",
      categoryItems: "Món hiện có",
      imageTooLarge: "Ảnh phải nhỏ hơn 5MB.",
      sharedTitle: "Thêm món dùng chung",
      sharedSavedMessage: "Đã thêm món dùng chung.",
      sharedScopeTitle: "Thực đơn dùng chung của công ty",
      sharedScopeDescription:
        "Sau khi lưu, món sẽ đồng bộ tới các chi nhánh đang kế thừa.",
    };
  }

  return {
    title: "New menu item",
    steps: ["Details", "Review", "Save"],
    primaryLanguage: "Primary language",
    category: "Category",
    itemName: "Menu item name",
    descriptionLabel: "Short description",
    price: "Base price",
    image: "Image",
    uploadImage: "Upload image",
    changeImage: "Change image",
    sizes: "Sizes",
    toppings: "Toppings",
    addSize: "Add size",
    addTopping: "Add topping",
    optionName: "Name",
    optionPrice: "Extra price",
    sizePrice: "Price",
    generate: "Review with AI",
    generating: "Reviewing...",
    back: "Back",
    continue: "Next",
    save: "Save",
    saving: "Saving...",
    reviewTitle: "Language review",
    confirmTitle: "Save summary",
    companyManaged: "Company category",
    branchManaged: "Branch category",
    requiredMessage: "Category, item name, and price are required.",
    generatedMessage: "AI drafted the multilingual menu copy.",
    savedMessage: "Menu item added.",
    aiDescriptionPlaceholder:
      "Example: sliced beef, rice noodles, herbs, clear broth",
    itemPlaceholder:
      "Example: Pho beef bowl, Matcha latte, Crispy spring rolls",
    optionPlaceholder: "Example: Cheese, Extra egg",
    standardSizes: "Add S / M / L",
    emptySizes: "No size options",
    emptyToppings: "No toppings",
    selectedLanguage: "Selected language",
    categoryItems: "Current items",
    imageTooLarge: "Image must be under 5 MB.",
    sharedTitle: "Add shared menu item",
    sharedSavedMessage: "Shared menu item added.",
    sharedScopeTitle: "Company shared menu",
    sharedScopeDescription:
      "After saving, inherited branch menus receive this reviewed item.",
  };
}

async function translateText(
  text: string,
  context: "item" | "topping",
): Promise<LocalizedFields> {
  const response = await fetch("/api/v1/ai/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, field: "name", context }),
  });

  if (!response.ok) {
    throw new Error("Failed to translate menu copy");
  }

  const data = (await response.json()) as {
    en: string;
    ja: string;
    vi: string;
  };
  return {
    en: data.en ?? "",
    ja: data.ja ?? "",
    vi: data.vi ?? "",
  };
}

function languageLabel(language: PrimaryLanguage) {
  if (language === "ja") return "日本語";
  if (language === "vi") return "Tiếng Việt";
  return "English";
}

function currencyValue(rawValue: string) {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function localizedCategoryName(
  category: Pick<WizardCategory, "name_en" | "name_ja" | "name_vi">,
  locale: string,
) {
  const language = localeToLanguage(locale);
  if (language === "vi")
    return category.name_vi || category.name_en || category.name_ja || "";
  if (language === "ja")
    return category.name_ja || category.name_en || category.name_vi || "";
  return category.name_en || category.name_ja || category.name_vi || "";
}

function primaryLanguageValue(
  values: LocalizedFields,
  language: PrimaryLanguage,
  fallback = "",
) {
  return values[language].trim() || fallback;
}

function secondaryLanguageValues(
  values: LocalizedFields,
  primaryLanguage: PrimaryLanguage,
) {
  const seen = new Set<string>();
  const primaryValue = values[primaryLanguage].trim();

  if (primaryValue) {
    seen.add(primaryValue.toLocaleLowerCase());
  }

  return orderedLanguages(primaryLanguage)
    .slice(1)
    .map((language) => values[language].trim())
    .filter((value) => {
      if (!value) return false;
      const normalizedValue = value.toLocaleLowerCase();
      if (seen.has(normalizedValue)) return false;
      seen.add(normalizedValue);
      return true;
    });
}

export function MenuItemCreationWizard({
  open,
  onOpenChange,
  mode = "branch",
  branchId,
  categories,
  ownerLanguage,
  locale,
  organizationName,
  branchName,
  onCreated,
}: MenuItemCreationWizardProps) {
  const copy = useMemo(() => buildLocaleCopy(locale), [locale]);
  const supabase = createClient();
  const isSharedMenu = mode === "organization-shared";
  const supportsItemOptions = true;
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryId: categories[0]?.id ?? "",
    primaryLanguage: ownerLanguage,
    primaryName: "",
    primaryDescription: "",
    basePrice: "",
    sizes: [] as OptionDraft[],
    toppings: [] as OptionDraft[],
    reviewNames: createEmptyTranslations(),
    reviewDescriptions: createEmptyTranslations(),
  });

  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId,
  );

  const reset = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setStep(0);
    setIsGenerating(false);
    setIsSaving(false);
    setImageFile(null);
    setImagePreview(null);
    setForm({
      categoryId: categories[0]?.id ?? "",
      primaryLanguage: ownerLanguage,
      primaryName: "",
      primaryDescription: "",
      basePrice: "",
      sizes: [],
      toppings: [],
      reviewNames: createEmptyTranslations(),
      reviewDescriptions: createEmptyTranslations(),
    });
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(copy.imageTooLarge);
      return;
    }

    try {
      const optimized = await optimizeMenuImageFile(file);
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(optimized.file);
      setImagePreview(optimized.previewUrl);
    } catch {
      toast.error(copy.imageTooLarge);
    } finally {
      event.target.value = "";
    }
  };

  const addStandardSizes = () => {
    const base = currencyValue(form.basePrice);
    setForm((current) => ({
      ...current,
      sizes: [
        {
          id: crypto.randomUUID(),
          baseName: "Small",
          basePrice: String(Math.round(base * 0.8)),
          sizeKey: "S",
          translations: createEmptyTranslations(),
        },
        {
          id: crypto.randomUUID(),
          baseName: "Medium",
          basePrice: String(base),
          sizeKey: "M",
          translations: createEmptyTranslations(),
        },
        {
          id: crypto.randomUUID(),
          baseName: "Large",
          basePrice: String(Math.round(base * 1.3)),
          sizeKey: "L",
          translations: createEmptyTranslations(),
        },
      ],
    }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    }
  };

  const addOption = (type: "sizes" | "toppings") => {
    const nextOption: OptionDraft = {
      id: crypto.randomUUID(),
      baseName: type === "sizes" ? "Medium" : "",
      basePrice: type === "sizes" ? form.basePrice : "",
      sizeKey: type === "sizes" ? "M" : undefined,
      translations: createEmptyTranslations(),
    };

    setForm((current) => ({
      ...current,
      [type]: [...current[type], nextOption],
    }));
  };

  const updateOption = (
    type: "sizes" | "toppings",
    optionId: string,
    patch: Partial<OptionDraft>,
  ) => {
    setForm((current) => ({
      ...current,
      [type]: current[type].map((option) =>
        option.id === optionId ? { ...option, ...patch } : option,
      ),
    }));
  };

  const removeOption = (type: "sizes" | "toppings", optionId: string) => {
    setForm((current) => ({
      ...current,
      [type]: current[type].filter((option) => option.id !== optionId),
    }));
  };

  const applyPrimaryLanguage = (
    translations: LocalizedFields,
    fallback: string,
  ) => {
    const nextTranslations = { ...translations };
    nextTranslations[form.primaryLanguage] = fallback;
    return nextTranslations;
  };

  const handleGenerateReview = async () => {
    if (
      !form.categoryId ||
      !form.primaryName.trim() ||
      form.basePrice.trim() === ""
    ) {
      toast.error(copy.requiredMessage);
      return;
    }

    setIsGenerating(true);

    try {
      const aiResponse = await fetch("/api/v1/ai/generate-menu-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: form.primaryName.trim(),
          existingDescription: form.primaryDescription.trim(),
          language: form.primaryLanguage,
          restaurantName:
            branchName ?? organizationName ?? "Restaurant group menu",
          restaurantDescription: isSharedMenu
            ? `Create reusable shared menu copy for ${organizationName ?? "a restaurant group"} that branches can inherit.`
            : organizationName && branchName
              ? `Create short branch-ready menu copy for ${branchName} under ${organizationName}.`
              : "Create short branch-ready menu copy for restaurant operators.",
        }),
      });

      if (!aiResponse.ok) {
        throw new Error("Failed to generate AI menu copy");
      }

      const aiDraft = (await aiResponse.json()) as {
        name_en: string;
        name_ja: string;
        name_vi: string;
        description_en: string;
        description_ja: string;
        description_vi: string;
      };

      const [sizeTranslations, toppingTranslations] = await Promise.all([
        Promise.all(
          form.sizes.map(async (size) => ({
            id: size.id,
            translations: applyPrimaryLanguage(
              await translateText(
                size.baseName ||
                  SIZE_KEY_NAMES[size.sizeKey ?? ""] ||
                  "Size option",
                "item",
              ),
              size.baseName,
            ),
          })),
        ),
        Promise.all(
          form.toppings.map(async (topping) => ({
            id: topping.id,
            translations: applyPrimaryLanguage(
              await translateText(topping.baseName || "Topping", "topping"),
              topping.baseName,
            ),
          })),
        ),
      ]);

      setForm((current) => ({
        ...current,
        reviewNames: {
          en:
            current.primaryLanguage === "en"
              ? current.primaryName.trim()
              : aiDraft.name_en || current.primaryName.trim(),
          ja:
            current.primaryLanguage === "ja"
              ? current.primaryName.trim()
              : aiDraft.name_ja || current.primaryName.trim(),
          vi:
            current.primaryLanguage === "vi"
              ? current.primaryName.trim()
              : aiDraft.name_vi || current.primaryName.trim(),
        },
        reviewDescriptions: {
          en:
            current.primaryLanguage === "en"
              ? current.primaryDescription.trim() ||
                aiDraft.description_en ||
                ""
              : (aiDraft.description_en ?? ""),
          ja:
            current.primaryLanguage === "ja"
              ? current.primaryDescription.trim() ||
                aiDraft.description_ja ||
                ""
              : (aiDraft.description_ja ?? ""),
          vi:
            current.primaryLanguage === "vi"
              ? current.primaryDescription.trim() ||
                aiDraft.description_vi ||
                ""
              : (aiDraft.description_vi ?? ""),
        },
        sizes: current.sizes.map((size) => {
          const match = sizeTranslations.find((entry) => entry.id === size.id);
          return match ? { ...size, translations: match.translations } : size;
        }),
        toppings: current.toppings.map((topping) => {
          const match = toppingTranslations.find(
            (entry) => entry.id === topping.id,
          );
          return match
            ? { ...topping, translations: match.translations }
            : topping;
        }),
      }));

      setStep(1);
      toast.success(copy.generatedMessage);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate AI draft",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const sessionResponse = await fetch("/api/v1/auth/session");
        const sessionData = await sessionResponse.json();
        if (!sessionData.authenticated) {
          throw new Error("User not authenticated");
        }

        const fileName = `${Date.now()}-${imageFile.name}`;
        const uploadScope = sessionData.user?.restaurantId ?? "shared-menu";
        const filePath = `restaurants/${uploadScope}/menu_items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("restaurant-uploads")
          .upload(filePath, imageFile, { cacheControl: "3600", upsert: false });

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from("restaurant-uploads")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const nameFields = {
        name_en: form.reviewNames.en || form.primaryName.trim(),
        name_ja: form.reviewNames.ja || form.primaryName.trim(),
        name_vi: form.reviewNames.vi || form.primaryName.trim(),
      };
      const descriptionFields = {
        description_en:
          form.reviewDescriptions.en || form.primaryDescription.trim(),
        description_ja:
          form.reviewDescriptions.ja || form.primaryDescription.trim(),
        description_vi:
          form.reviewDescriptions.vi || form.primaryDescription.trim(),
      };

      const response = isSharedMenu
        ? await fetch("/api/v1/owner/organization/shared-menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "item",
              category_id: form.categoryId,
              ...nameFields,
              ...descriptionFields,
              price: currencyValue(form.basePrice),
              image_url: imageUrl,
              available: true,
              position: selectedCategory?.itemCount ?? 0,
              sizes: form.sizes
                .filter(
                  (size) => size.sizeKey || size.baseName.trim().length > 0,
                )
                .map((size, index) => ({
                  size_key: size.sizeKey?.trim() || `size-${index + 1}`,
                  name_en:
                    size.translations.en ||
                    SIZE_KEY_NAMES[size.sizeKey ?? ""] ||
                    size.baseName,
                  name_ja: size.translations.ja || size.baseName,
                  name_vi: size.translations.vi || size.baseName,
                  price: currencyValue(size.basePrice),
                  position: index,
                })),
              toppings: form.toppings
                .filter((topping) => topping.baseName.trim().length > 0)
                .map((topping, index) => ({
                  name_en: topping.translations.en || topping.baseName,
                  name_ja: topping.translations.ja || topping.baseName,
                  name_vi: topping.translations.vi || topping.baseName,
                  price: currencyValue(topping.basePrice),
                  position: index,
                })),
            }),
          })
        : await fetch(
            `/api/v1/owner/menu/menu-items?branchId=${encodeURIComponent(branchId ?? "")}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category_id: form.categoryId,
                ...nameFields,
                ...descriptionFields,
                price: currencyValue(form.basePrice),
                image_url: imageUrl,
                available: true,
                weekday_visibility: [1, 2, 3, 4, 5, 6, 7],
                position: selectedCategory?.itemCount ?? 0,
                sizes: form.sizes
                  .filter(
                    (size) => size.sizeKey || size.baseName.trim().length > 0,
                  )
                  .map((size, index) => ({
                    size_key: size.sizeKey?.trim() || `size-${index + 1}`,
                    name_en:
                      size.translations.en ||
                      SIZE_KEY_NAMES[size.sizeKey ?? ""] ||
                      size.baseName,
                    name_ja: size.translations.ja || size.baseName,
                    name_vi: size.translations.vi || size.baseName,
                    price: currencyValue(size.basePrice),
                    position: index,
                  })),
                toppings: form.toppings
                  .filter((topping) => topping.baseName.trim().length > 0)
                  .map((topping, index) => ({
                    name_en: topping.translations.en || topping.baseName,
                    name_ja: topping.translations.ja || topping.baseName,
                    name_vi: topping.translations.vi || topping.baseName,
                    price: currencyValue(topping.basePrice),
                    position: index,
                  })),
              }),
            },
          );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error ?? data.message ?? "Failed to save menu item",
        );
      }

      toast.success(isSharedMenu ? copy.sharedSavedMessage : copy.savedMessage);
      await onCreated();
      handleOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save menu item",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderSizeRow = (option: OptionDraft) => (
    <div
      key={option.id}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-center gap-2">
        <Select
          value={option.sizeKey ?? "M"}
          onValueChange={(value) =>
            updateOption("sizes", option.id, {
              sizeKey: value,
              baseName: SIZE_KEY_NAMES[value] ?? value,
            })
          }
        >
          <SelectTrigger className="h-10 w-24 shrink-0 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            {(["S", "M", "L", "XL"] as const).map((key) => (
              <SelectItem key={key} value={key}>
                {key} — {SIZE_KEY_NAMES[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={option.basePrice}
          onChange={(event) =>
            updateOption("sizes", option.id, { basePrice: event.target.value })
          }
          placeholder="0"
          inputMode="decimal"
          className="h-10 flex-1 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          onClick={() => removeOption("sizes", option.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderToppingRow = (option: OptionDraft) => (
    <div
      key={option.id}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_0.55fr_auto]">
        <Input
          value={option.baseName}
          onChange={(event) =>
            updateOption("toppings", option.id, {
              baseName: event.target.value,
            })
          }
          placeholder={copy.optionPlaceholder}
          className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <Input
          type="number"
          value={option.basePrice}
          onChange={(event) =>
            updateOption("toppings", option.id, {
              basePrice: event.target.value,
            })
          }
          placeholder="0"
          inputMode="decimal"
          className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          onClick={() => removeOption("toppings", option.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderLocalizedReview = (
    label: string,
    values: LocalizedFields,
    onChange: (patch: Partial<LocalizedFields>) => void,
    multiline = false,
  ) => (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-3 flex items-center gap-2">
        <Languages className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {label}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {orderedLanguages(form.primaryLanguage).map((language) => {
          const FieldComponent = multiline ? Textarea : Input;
          return (
            <div key={language} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {languageLabel(language)}
                </p>
                {language === form.primaryLanguage ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {copy.selectedLanguage}
                  </Badge>
                ) : null}
              </div>
              <FieldComponent
                value={values[language]}
                onChange={(event) =>
                  onChange({ [language]: event.target.value })
                }
                rows={multiline ? 3 : undefined}
                className={cn(
                  "rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
                  !multiline && "h-10",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[32px] border border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950 sm:max-w-4xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {copy.steps.map((stepLabel, index) => (
              <Badge
                key={stepLabel}
                variant="secondary"
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  index === step
                    ? "bg-slate-900 text-white hover:bg-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300",
                )}
              >
                {index + 1}. {stepLabel}
              </Badge>
            ))}
          </div>
          <DialogTitle className="mt-4 text-2xl font-semibold text-slate-950 dark:text-slate-100">
            {isSharedMenu ? copy.sharedTitle : copy.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          {step === 0 ? (
            <>
              {/* Row 1: category / language / price */}
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_0.8fr]">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {copy.category}
                  </p>
                  <Select
                    value={form.categoryId}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, categoryId: value }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      <SelectValue placeholder={copy.category} />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {localizedCategoryName(category, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {copy.primaryLanguage}
                  </p>
                  <Select
                    value={form.primaryLanguage}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        primaryLanguage: value as PrimaryLanguage,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="vi">Tiếng Việt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {copy.price}
                  </p>
                  <Input
                    value={form.basePrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        basePrice: event.target.value,
                      }))
                    }
                    placeholder="0"
                    inputMode="decimal"
                    className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Row 2: item name + category info */}
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {copy.itemName}
                  </p>
                  <Input
                    value={form.primaryName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        primaryName: event.target.value,
                      }))
                    }
                    placeholder={copy.itemPlaceholder}
                    className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {isSharedMenu ||
                        selectedCategory?.source === "organization"
                          ? copy.companyManaged
                          : copy.branchManaged}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {selectedCategory
                          ? `${copy.categoryItems}: ${selectedCategory.itemCount}`
                          : copy.category}
                      </p>
                    </div>
                    <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-100">
                      {isSharedMenu ||
                      selectedCategory?.source === "organization"
                        ? "ORG"
                        : "LOCAL"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {copy.descriptionLabel}
                </p>
                <Textarea
                  value={form.primaryDescription}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      primaryDescription: event.target.value,
                    }))
                  }
                  placeholder={copy.aiDescriptionPlaceholder}
                  rows={3}
                  className="rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {supportsItemOptions ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {copy.image}
                  </p>
                  <div className="flex items-center gap-3">
                    {imagePreview ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                          onClick={() => {
                            if (imagePreview.startsWith("blob:")) {
                              URL.revokeObjectURL(imagePreview);
                            }
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900">
                        {imageFile ? copy.changeImage : copy.uploadImage}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageSelect}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {copy.sharedScopeTitle}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {copy.sharedScopeDescription}
                  </p>
                </div>
              )}

              {supportsItemOptions ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Sizes */}
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {copy.sizes}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                          onClick={addStandardSizes}
                        >
                          {copy.standardSizes}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                          onClick={() => addOption("sizes")}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {copy.addSize}
                        </Button>
                      </div>
                    </div>
                    {form.sizes.length > 0 ? (
                      <div className="space-y-2">
                        {form.sizes.map(renderSizeRow)}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {copy.emptySizes}
                      </p>
                    )}
                  </div>

                  {/* Toppings */}
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {copy.toppings}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                        onClick={() => addOption("toppings")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {copy.addTopping}
                      </Button>
                    </div>
                    {form.toppings.length > 0 ? (
                      <div className="space-y-2">
                        {form.toppings.map(renderToppingRow)}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {copy.emptyToppings}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              {renderLocalizedReview(copy.itemName, form.reviewNames, (patch) =>
                setForm((current) => ({
                  ...current,
                  reviewNames: { ...current.reviewNames, ...patch },
                })),
              )}

              {renderLocalizedReview(
                copy.descriptionLabel,
                form.reviewDescriptions,
                (patch) =>
                  setForm((current) => ({
                    ...current,
                    reviewDescriptions: {
                      ...current.reviewDescriptions,
                      ...patch,
                    },
                  })),
                true,
              )}

              {supportsItemOptions && form.sizes.length > 0 ? (
                <div className="rounded-[24px] border border-slate-200 p-4 dark:border-slate-800">
                  <p className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {copy.sizes}
                  </p>
                  <div className="space-y-4">
                    {form.sizes.map((size) => (
                      <div
                        key={size.id}
                        className="rounded-2xl bg-slate-50/70 p-4 dark:bg-slate-900/70"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {size.sizeKey ? (
                            <Badge variant="secondary" className="rounded-full">
                              {size.sizeKey}
                            </Badge>
                          ) : null}
                          <Badge variant="secondary" className="rounded-full">
                            {currencyValue(size.basePrice)}
                          </Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          {orderedLanguages(form.primaryLanguage).map(
                            (language) => (
                              <Input
                                key={language}
                                value={size.translations[language]}
                                onChange={(event) =>
                                  updateOption("sizes", size.id, {
                                    translations: {
                                      ...size.translations,
                                      [language]: event.target.value,
                                    },
                                  })
                                }
                                className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                              />
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {supportsItemOptions && form.toppings.length > 0 ? (
                <div className="rounded-[24px] border border-slate-200 p-4 dark:border-slate-800">
                  <p className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {copy.toppings}
                  </p>
                  <div className="space-y-4">
                    {form.toppings.map((topping) => (
                      <div
                        key={topping.id}
                        className="rounded-2xl bg-slate-50/70 p-4 dark:bg-slate-900/70"
                      >
                        <div className="mb-3">
                          <Badge variant="secondary" className="rounded-full">
                            +{currencyValue(topping.basePrice)}
                          </Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          {orderedLanguages(form.primaryLanguage).map(
                            (language) => (
                              <Input
                                key={language}
                                value={topping.translations[language]}
                                onChange={(event) =>
                                  updateOption("toppings", topping.id, {
                                    translations: {
                                      ...topping.translations,
                                      [language]: event.target.value,
                                    },
                                  })
                                }
                                className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                              />
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-100">
                    {selectedCategory
                      ? localizedCategoryName(selectedCategory, locale)
                      : copy.category}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {languageLabel(form.primaryLanguage)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {currencyValue(form.basePrice)}
                  </Badge>
                  {imageFile ? (
                    <Badge variant="secondary" className="rounded-full">
                      <ImageIcon className="mr-1.5 h-3 w-3" />
                      {imageFile.name}
                    </Badge>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "mt-4 grid gap-5",
                    supportsItemOptions && "lg:grid-cols-[1.1fr_0.9fr]",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {copy.reviewTitle}
                    </p>
                    <div className="mt-3 space-y-3">
                      {orderedLanguages(form.primaryLanguage).map(
                        (language) => (
                          <div
                            key={language}
                            className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                {languageLabel(language)}
                              </p>
                              {language === form.primaryLanguage ? (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  {copy.selectedLanguage}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-2 text-base font-semibold text-slate-950 dark:text-slate-100">
                              {form.reviewNames[language] || "-"}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                              {form.reviewDescriptions[language] || "-"}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {supportsItemOptions ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {copy.sizes}
                        </p>
                        <div className="mt-3 space-y-2">
                          {form.sizes.length > 0 ? (
                            form.sizes.map((size) => (
                              <div
                                key={size.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {primaryLanguageValue(
                                      size.translations,
                                      form.primaryLanguage,
                                      SIZE_KEY_NAMES[size.sizeKey ?? ""] ||
                                        size.baseName,
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {secondaryLanguageValues(
                                      size.translations,
                                      form.primaryLanguage,
                                    ).join(" • ") || size.sizeKey}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {currencyValue(size.basePrice)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {copy.emptySizes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {copy.toppings}
                        </p>
                        <div className="mt-3 space-y-2">
                          {form.toppings.length > 0 ? (
                            form.toppings.map((topping) => (
                              <div
                                key={topping.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {primaryLanguageValue(
                                      topping.translations,
                                      form.primaryLanguage,
                                      topping.baseName,
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {secondaryLanguageValues(
                                      topping.translations,
                                      form.primaryLanguage,
                                    ).join(" • ") || topping.baseName}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  +{currencyValue(topping.basePrice)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {copy.emptyToppings}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-5 dark:border-slate-800 sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Check className="h-4 w-4" />
            {copy.steps[step]}
          </div>
          <div className="flex flex-wrap gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                onClick={() => setStep((current) => current - 1)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {copy.back}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                onClick={() => handleOpenChange(false)}
              >
                {copy.back}
              </Button>
            )}

            {step === 0 ? (
              <Button
                type="button"
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                onClick={handleGenerateReview}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                ) : (
                  <WandSparkles className="mr-2 h-4 w-4" />
                )}
                {isGenerating ? copy.generating : copy.generate}
              </Button>
            ) : null}

            {step === 1 ? (
              <Button
                type="button"
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                onClick={() => setStep(2)}
              >
                {copy.continue}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}

            {step === 2 ? (
              <Button
                type="button"
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {isSaving ? copy.saving : copy.save}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

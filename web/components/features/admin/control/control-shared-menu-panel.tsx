"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Eye,
  EyeOff,
  Layers3,
  type LucideIcon,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type {
  OrganizationMenuInsights,
  OrganizationSharedMenuCategory,
} from "@/lib/server/organizations/shared-menu";
import { MenuItemCreationWizard } from "@/components/features/admin/menu/MenuItemCreationWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface ControlSharedMenuPanelProps {
  categories: OrganizationSharedMenuCategory[];
  insights: OrganizationMenuInsights;
  organizationName?: string;
  locale: string;
}

type PrimaryLanguage = "en" | "ja" | "vi";
type CategoryStatusFilter = "all" | "active" | "inactive";

type CategoryFormState = {
  id: string | null;
  primaryName: string;
  primaryLanguage: PrimaryLanguage;
  name_en: string;
  name_ja: string;
  name_vi: string;
};

type ProfessionalCategoryPreset = {
  key: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  tags: Array<"core" | "full-service" | "cafe" | "quick" | "bar">;
};

const PROFESSIONAL_CATEGORY_PRESETS: ProfessionalCategoryPreset[] = [
  {
    key: "appetizers",
    name_en: "Appetizers",
    name_ja: "前菜",
    name_vi: "Món khai vị",
    tags: ["core", "full-service", "bar"],
  },
  {
    key: "salads",
    name_en: "Salads",
    name_ja: "サラダ",
    name_vi: "Salad",
    tags: ["full-service", "cafe"],
  },
  {
    key: "soups",
    name_en: "Soups",
    name_ja: "スープ",
    name_vi: "Súp",
    tags: ["full-service", "quick"],
  },
  {
    key: "signature",
    name_en: "Signature Dishes",
    name_ja: "看板料理",
    name_vi: "Món đặc trưng",
    tags: ["core", "full-service", "quick"],
  },
  {
    key: "mains",
    name_en: "Main Dishes",
    name_ja: "メイン料理",
    name_vi: "Món chính",
    tags: ["core", "full-service", "quick"],
  },
  {
    key: "rice-noodles",
    name_en: "Rice & Noodles",
    name_ja: "ご飯・麺類",
    name_vi: "Cơm & Mì",
    tags: ["core", "quick"],
  },
  {
    key: "seafood",
    name_en: "Seafood",
    name_ja: "シーフード",
    name_vi: "Hải sản",
    tags: ["full-service"],
  },
  {
    key: "meat",
    name_en: "Meat Dishes",
    name_ja: "肉料理",
    name_vi: "Món thịt",
    tags: ["full-service"],
  },
  {
    key: "vegetarian",
    name_en: "Vegetarian",
    name_ja: "ベジタリアン",
    name_vi: "Món chay",
    tags: ["core", "full-service", "cafe"],
  },
  {
    key: "sets",
    name_en: "Set Meals",
    name_ja: "セットメニュー",
    name_vi: "Set ăn",
    tags: ["core", "quick"],
  },
  {
    key: "sides",
    name_en: "Side Dishes",
    name_ja: "サイドメニュー",
    name_vi: "Món ăn kèm",
    tags: ["core", "quick", "bar"],
  },
  {
    key: "desserts",
    name_en: "Desserts",
    name_ja: "デザート",
    name_vi: "Tráng miệng",
    tags: ["core", "full-service", "cafe"],
  },
  {
    key: "drinks",
    name_en: "Drinks",
    name_ja: "ドリンク",
    name_vi: "Đồ uống",
    tags: ["core", "quick", "bar", "cafe"],
  },
  {
    key: "coffee-tea",
    name_en: "Coffee & Tea",
    name_ja: "コーヒー・紅茶",
    name_vi: "Cà phê & Trà",
    tags: ["cafe"],
  },
  {
    key: "alcohol",
    name_en: "Alcohol",
    name_ja: "アルコール",
    name_vi: "Đồ uống có cồn",
    tags: ["bar", "full-service"],
  },
  {
    key: "kids",
    name_en: "Kids Menu",
    name_ja: "キッズメニュー",
    name_vi: "Thực đơn trẻ em",
    tags: ["full-service"],
  },
  {
    key: "seasonal",
    name_en: "Seasonal Specials",
    name_ja: "季節限定",
    name_vi: "Món theo mùa",
    tags: ["full-service", "cafe", "bar"],
  },
];

function localeToPrimaryLanguage(locale: string): PrimaryLanguage {
  const normalizedLocale = locale.toLowerCase();
  if (normalizedLocale.startsWith("ja")) return "ja";
  if (normalizedLocale.startsWith("vi")) return "vi";
  return "en";
}

function buildCopy(locale: string) {
  const language = localeToPrimaryLanguage(locale);
  if (language === "ja") {
    return {
      title: "メニュー",
      addCategory: "カテゴリ",
      categorySet: "カテゴリセット",
      addItem: "メニュー追加",
      active: "有効",
      inactive: "停止",
      all: "すべて",
      search: "検索",
      categories: "カテゴリ",
      items: "商品",
      activeCategories: "有効カテゴリ",
      rating: "評価",
      feedback: "声",
      topItems: "売れ筋",
      categoryList: "カテゴリ",
      itemList: "商品",
      name: "名前",
      code: "コード",
      count: "数",
      status: "状態",
      action: "操作",
      price: "価格",
      sold: "販売数",
      revenue: "売上",
      review: "レビュー",
      noData: "データなし",
      editCategory: "カテゴリ編集",
      createCategory: "カテゴリ追加",
      categorySetTitle: "カテゴリセット",
      smartPick: "AIで選択",
      selectAll: "すべて選択",
      clear: "解除",
      selected: "選択中",
      addSelected: "選択を追加",
      categorySetAdded: "カテゴリを追加しました。",
      primaryLanguage: "入力言語",
      categoryName: "カテゴリ名",
      english: "英語",
      japanese: "日本語",
      vietnamese: "ベトナム語",
      cancel: "キャンセル",
      save: "保存",
      saving: "保存中...",
      created: "カテゴリを追加しました。",
      updated: "カテゴリを更新しました。",
      removed: "カテゴリを削除しました。",
      activated: "カテゴリを有効にしました。",
      deactivated: "カテゴリを停止しました。",
      required: "カテゴリ名が必要です。",
      failed: "保存できませんでした。",
      deleteConfirm: "このカテゴリを削除しますか？",
      edit: "編集",
      deactivate: "停止",
      activate: "有効化",
      delete: "削除",
    };
  }

  if (language === "vi") {
    return {
      title: "Thực đơn",
      addCategory: "Danh mục",
      categorySet: "Bộ danh mục",
      addItem: "Thêm món",
      active: "Đang dùng",
      inactive: "Tạm ẩn",
      all: "Tất cả",
      search: "Tìm kiếm",
      categories: "Danh mục",
      items: "Món",
      activeCategories: "Danh mục dùng",
      rating: "Đánh giá",
      feedback: "Phản hồi",
      topItems: "Món bán tốt",
      categoryList: "Danh mục",
      itemList: "Món",
      name: "Tên",
      code: "Mã",
      count: "Số lượng",
      status: "Trạng thái",
      action: "Thao tác",
      price: "Giá",
      sold: "Đã bán",
      revenue: "Doanh thu",
      review: "Review",
      noData: "Chưa có dữ liệu",
      editCategory: "Sửa danh mục",
      createCategory: "Thêm danh mục",
      categorySetTitle: "Bộ danh mục",
      smartPick: "AI chọn",
      selectAll: "Chọn tất cả",
      clear: "Bỏ chọn",
      selected: "Đã chọn",
      addSelected: "Thêm mục đã chọn",
      categorySetAdded: "Đã thêm danh mục.",
      primaryLanguage: "Ngôn ngữ nhập",
      categoryName: "Tên danh mục",
      english: "Tiếng Anh",
      japanese: "Tiếng Nhật",
      vietnamese: "Tiếng Việt",
      cancel: "Hủy",
      save: "Lưu",
      saving: "Đang lưu...",
      created: "Đã thêm danh mục.",
      updated: "Đã cập nhật danh mục.",
      removed: "Đã xóa danh mục.",
      activated: "Đã bật danh mục.",
      deactivated: "Đã tạm ẩn danh mục.",
      required: "Cần tên danh mục.",
      failed: "Không thể lưu.",
      deleteConfirm: "Xóa danh mục này?",
      edit: "Sửa",
      deactivate: "Ẩn",
      activate: "Bật",
      delete: "Xóa",
    };
  }

  return {
    title: "Menu",
    addCategory: "Category",
    categorySet: "Category set",
    addItem: "Add item",
    active: "Active",
    inactive: "Inactive",
    all: "All",
    search: "Search",
    categories: "Categories",
    items: "Items",
    activeCategories: "Active categories",
    rating: "Rating",
    feedback: "Feedback",
    topItems: "Best sellers",
    categoryList: "Categories",
    itemList: "Items",
    name: "Name",
    code: "Code",
    count: "Count",
    status: "Status",
    action: "Action",
    price: "Price",
    sold: "Sold",
    revenue: "Revenue",
    review: "Reviews",
    noData: "No data",
    editCategory: "Edit category",
    createCategory: "Add category",
    categorySetTitle: "Category set",
    smartPick: "AI pick",
    selectAll: "Select all",
    clear: "Clear",
    selected: "Selected",
    addSelected: "Add selected",
    categorySetAdded: "Categories added.",
    primaryLanguage: "Input language",
    categoryName: "Category name",
    english: "English",
    japanese: "Japanese",
    vietnamese: "Vietnamese",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    created: "Category added.",
    updated: "Category updated.",
    removed: "Category removed.",
    activated: "Category activated.",
    deactivated: "Category deactivated.",
    required: "Category name is required.",
    failed: "Could not save.",
    deleteConfirm: "Delete this category?",
    edit: "Edit",
    deactivate: "Deactivate",
    activate: "Activate",
    delete: "Delete",
  };
}

function localizedName(
  locale: string,
  value: { name_en: string | null; name_ja?: string | null; name_vi?: string | null },
) {
  const language = localeToPrimaryLanguage(locale);
  const names =
    language === "ja"
      ? [value.name_ja, value.name_en, value.name_vi]
      : language === "vi"
        ? [value.name_vi, value.name_en, value.name_ja]
        : [value.name_en, value.name_ja, value.name_vi];
  return names.find((name) => Boolean(name?.trim())) ?? value.name_en ?? "";
}

function formatPrice(locale: string, price: number) {
  return new Intl.NumberFormat(locale || "ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(price);
}

async function translateCategoryName(text: string) {
  const response = await fetch("/api/v1/ai/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, field: "name", context: "category" }),
  });

  if (!response.ok) throw new Error("Failed to translate category");
  return response.json() as Promise<{ en: string; ja: string; vi: string }>;
}

function emptyCategoryForm(language: PrimaryLanguage): CategoryFormState {
  return {
    id: null,
    primaryName: "",
    primaryLanguage: language,
    name_en: "",
    name_ja: "",
    name_vi: "",
  };
}

export function ControlSharedMenuPanel({
  categories,
  insights,
  organizationName,
  locale,
}: ControlSharedMenuPanelProps) {
  const router = useRouter();
  const copy = useMemo(() => buildCopy(locale), [locale]);
  const ownerLanguage = localeToPrimaryLanguage(locale);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isCreatingPresets, setIsCreatingPresets] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CategoryStatusFilter>("all");
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(
    emptyCategoryForm(ownerLanguage),
  );
  const [selectedPresetKeys, setSelectedPresetKeys] = useState<string[]>([]);

  const totalItems = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories],
  );
  const activeCategories = categories.filter((category) => category.is_active);
  const existingCategoryNames = useMemo(
    () =>
      new Set(
        categories.flatMap((category) =>
          [category.name_en, category.name_ja, category.name_vi]
            .filter(
              (value): value is string =>
                typeof value === "string" && value.trim().length > 0,
            )
            .map((value) => value.trim().toLowerCase()),
        ),
      ),
    [categories],
  );
  const availablePresets = PROFESSIONAL_CATEGORY_PRESETS.filter(
    (preset) =>
      ![preset.name_en, preset.name_ja, preset.name_vi].some((name) =>
        existingCategoryNames.has(name.trim().toLowerCase()),
      ),
  );
  const activeItems = activeCategories.reduce(
    (sum, category) =>
      sum + category.items.filter((item) => item.available).length,
    0,
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredCategories = categories.filter((category) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && category.is_active) ||
      (statusFilter === "inactive" && !category.is_active);
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [category.name_en, category.name_ja, category.name_vi]
        .filter(Boolean)
        .some((name) => name!.toLowerCase().includes(normalizedSearch));
    return matchesStatus && matchesSearch;
  });
  const filteredItems = filteredCategories.flatMap((category) =>
    category.items.map((item) => ({ ...item, category })),
  );
  const maxTopQuantity = Math.max(
    ...insights.topItems.map((item) => item.quantity),
    1,
  );
  const summaryStats: Array<{
    label: string;
    value: string | number;
    icon: LucideIcon;
  }> = [
    { label: copy.categories, value: categories.length, icon: BarChart3 },
    {
      label: copy.activeCategories,
      value: activeCategories.length,
      icon: Eye,
    },
    { label: copy.items, value: activeItems, icon: Sparkles },
    {
      label: copy.rating,
      value: insights.averageRating ? insights.averageRating.toFixed(1) : "0.0",
      icon: Star,
    },
  ];

  const refresh = () => router.refresh();

  const openCreateCategory = () => {
    setCategoryForm(emptyCategoryForm(ownerLanguage));
    setIsCategoryDialogOpen(true);
  };

  const openEditCategory = (category: OrganizationSharedMenuCategory) => {
    setCategoryForm({
      id: category.id,
      primaryName: localizedName(locale, category),
      primaryLanguage: ownerLanguage,
      name_en: category.name_en,
      name_ja: category.name_ja ?? "",
      name_vi: category.name_vi ?? "",
    });
    setIsCategoryDialogOpen(true);
  };

  const openPresetPicker = () => {
    setSelectedPresetKeys([]);
    setIsPresetDialogOpen(true);
  };

  const smartPickPresets = () => {
    const name = organizationName?.toLowerCase() ?? "";
    const wantedTags: ProfessionalCategoryPreset["tags"] =
      name.includes("cafe") || name.includes("coffee")
        ? ["core", "cafe"]
        : name.includes("bar") || name.includes("izakaya")
          ? ["core", "bar"]
          : name.includes("fast") || name.includes("takeout")
            ? ["core", "quick"]
            : ["core", "full-service"];
    const picked = availablePresets
      .filter((preset) => preset.tags.some((tag) => wantedTags.includes(tag)))
      .slice(0, 8)
      .map((preset) => preset.key);

    setSelectedPresetKeys(picked);
  };

  const togglePreset = (presetKey: string) => {
    setSelectedPresetKeys((current) =>
      current.includes(presetKey)
        ? current.filter((key) => key !== presetKey)
        : [...current, presetKey],
    );
  };

  const saveCategory = async () => {
    const trimmedPrimaryName = categoryForm.primaryName.trim();
    if (!trimmedPrimaryName && !categoryForm.name_en.trim()) {
      toast.error(copy.required);
      return;
    }

    setIsSavingCategory(true);
    try {
      let translatedNames = {
        name_en: categoryForm.name_en.trim(),
        name_ja: categoryForm.name_ja.trim(),
        name_vi: categoryForm.name_vi.trim(),
      };

      if (
        !translatedNames.name_en ||
        !translatedNames.name_ja ||
        !translatedNames.name_vi
      ) {
        const translations = await translateCategoryName(
          trimmedPrimaryName || translatedNames.name_en,
        );
        translatedNames = {
          name_en: translatedNames.name_en || translations.en,
          name_ja: translatedNames.name_ja || translations.ja,
          name_vi: translatedNames.name_vi || translations.vi,
        };
      }

      if (categoryForm.primaryLanguage === "en") {
        translatedNames.name_en = trimmedPrimaryName || translatedNames.name_en;
      } else if (categoryForm.primaryLanguage === "ja") {
        translatedNames.name_ja = trimmedPrimaryName || translatedNames.name_ja;
      } else {
        translatedNames.name_vi = trimmedPrimaryName || translatedNames.name_vi;
      }

      const isEdit = Boolean(categoryForm.id);
      const response = await fetch(
        isEdit
          ? `/api/v1/owner/organization/shared-menu/categories/${categoryForm.id}`
          : "/api/v1/owner/organization/shared-menu",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isEdit ? {} : { type: "category", position: categories.length }),
            ...translatedNames,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? copy.failed);

      toast.success(isEdit ? copy.updated : copy.created);
      setIsCategoryDialogOpen(false);
      setCategoryForm(emptyCategoryForm(ownerLanguage));
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const updateCategoryStatus = async (
    category: OrganizationSharedMenuCategory,
    isActive: boolean,
  ) => {
    const response = await fetch(
      `/api/v1/owner/organization/shared-menu/categories/${category.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? copy.failed);
      return;
    }

    toast.success(isActive ? copy.activated : copy.deactivated);
    refresh();
  };

  const createSelectedPresets = async () => {
    const selectedPresets = PROFESSIONAL_CATEGORY_PRESETS.filter((preset) =>
      selectedPresetKeys.includes(preset.key),
    ).filter(
      (preset) =>
        ![preset.name_en, preset.name_ja, preset.name_vi].some((name) =>
          existingCategoryNames.has(name.trim().toLowerCase()),
        ),
    );

    if (selectedPresets.length === 0) return;

    setIsCreatingPresets(true);
    try {
      for (const [index, preset] of selectedPresets.entries()) {
        const response = await fetch("/api/v1/owner/organization/shared-menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "category",
            name_en: preset.name_en,
            name_ja: preset.name_ja,
            name_vi: preset.name_vi,
            position: categories.length + index,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? copy.failed);
      }

      toast.success(copy.categorySetAdded);
      setIsPresetDialogOpen(false);
      setSelectedPresetKeys([]);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    } finally {
      setIsCreatingPresets(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!window.confirm(copy.deleteConfirm)) return;

    const response = await fetch(
      `/api/v1/owner/organization/shared-menu/categories/${categoryId}`,
      { method: "DELETE" },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? copy.failed);
      return;
    }

    toast.success(copy.removed);
    refresh();
  };

  const deleteItem = async (itemId: string) => {
    const response = await fetch(
      `/api/v1/owner/organization/shared-menu/items/${itemId}`,
      { method: "DELETE" },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? copy.failed);
      return;
    }

    refresh();
  };

  return (
    <section className="space-y-4 text-[#F8EEDF]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {copy.title}
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={openCreateCategory}
            className="h-10 rounded-lg border-white/15 bg-white/8 text-[#F8EEDF] hover:bg-white/14"
          >
            <Plus className="mr-2 h-4 w-4" />
            {copy.addCategory}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={openPresetPicker}
            className="h-10 rounded-lg border-white/15 bg-white/8 text-[#F8EEDF] hover:bg-white/14"
          >
            <Layers3 className="mr-2 h-4 w-4" />
            {copy.categorySet}
          </Button>
          <Button
            type="button"
            onClick={() => setIsItemDialogOpen(true)}
            disabled={activeCategories.length === 0}
            className="h-10 rounded-lg bg-[#F5B76D] text-[#23160E] hover:bg-[#FFD08B]"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {copy.addItem}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#D7BFA4]">
                {label}
              </span>
              <Icon className="h-4 w-4 text-[#F5B76D]" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">
              {copy.topItems}
            </h2>
            <Badge className="rounded-md border-white/10 bg-white/10 text-[#F8EEDF] hover:bg-white/10">
              {insights.feedbackCount} {copy.feedback}
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {insights.topItems.length > 0 ? (
              insights.topItems.map((item) => (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-[#FFF8EE]">
                      {localizedName(locale, item)}
                    </span>
                    <span className="shrink-0 text-[#D7BFA4]">
                      {item.quantity} {copy.sold}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm bg-black/30">
                    <div
                      className="h-full rounded-sm bg-[#F5B76D]"
                      style={{
                        width: `${Math.max(8, (item.quantity / maxTopQuantity) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#B99C7D]">
                    <span>{formatPrice(locale, item.revenue)}</span>
                    <span>
                      {item.rating ? item.rating.toFixed(1) : "-"} /{" "}
                      {item.reviewCount} {copy.review}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-sm text-[#D7BFA4]">
                {copy.noData}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-white">
              {copy.categoryList}
            </h2>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#B99C7D]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={copy.search}
                  className="h-9 rounded-lg border-white/10 bg-black/20 pl-9 text-[#F8EEDF] placeholder:text-[#B99C7D]"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as CategoryStatusFilter)
                }
              >
                <SelectTrigger className="h-9 w-32 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.all}</SelectItem>
                  <SelectItem value="active">{copy.active}</SelectItem>
                  <SelectItem value="inactive">{copy.inactive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <div className="hidden bg-black/20 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#B99C7D] sm:grid sm:grid-cols-[1.4fr_0.6fr_0.7fr_1fr]">
              <span>{copy.name}</span>
              <span>{copy.count}</span>
              <span>{copy.status}</span>
              <span className="text-right">{copy.action}</span>
            </div>
            <div className="divide-y divide-white/10">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="grid gap-3 px-3 py-3 text-sm sm:grid-cols-[1.4fr_0.6fr_0.7fr_1fr] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#FFF8EE]">
                        {localizedName(locale, category)}
                      </p>
                      <p className="truncate text-xs text-[#B99C7D]">
                        {category.name_en}
                      </p>
                    </div>
                    <div className="text-[#D7BFA4]">
                      {category.items.length}
                    </div>
                    <div>
                      <Badge
                        className={cn(
                          "rounded-md border text-xs",
                          category.is_active
                            ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
                            : "border-white/10 bg-white/8 text-[#B99C7D]",
                        )}
                      >
                        {category.is_active ? copy.active : copy.inactive}
                      </Badge>
                    </div>
                    <div className="flex justify-start gap-1 sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={copy.edit}
                        className="h-8 w-8 rounded-md text-[#F8EEDF] hover:bg-white/10"
                        onClick={() => openEditCategory(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={
                          category.is_active ? copy.deactivate : copy.activate
                        }
                        className="h-8 w-8 rounded-md text-[#F8EEDF] hover:bg-white/10"
                        onClick={() =>
                          updateCategoryStatus(category, !category.is_active)
                        }
                      >
                        {category.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={copy.delete}
                        className="h-8 w-8 rounded-md text-red-200 hover:bg-red-500/10"
                        onClick={() => deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-10 text-center text-sm text-[#D7BFA4]">
                  {copy.noData}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">{copy.itemList}</h2>
          <Badge className="rounded-md border-white/10 bg-white/10 text-[#F8EEDF] hover:bg-white/10">
            {totalItems}
          </Badge>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-[#B99C7D]">
              <tr>
                <th className="py-2 pr-4 font-medium">{copy.name}</th>
                <th className="py-2 pr-4 font-medium">{copy.categoryList}</th>
                <th className="py-2 pr-4 font-medium">{copy.price}</th>
                <th className="py-2 pr-4 font-medium">{copy.status}</th>
                <th className="py-2 text-right font-medium">{copy.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-[240px] py-3 pr-4">
                      <p className="truncate font-medium text-[#FFF8EE]">
                        {localizedName(locale, item)}
                      </p>
                      <p className="truncate text-xs text-[#B99C7D]">
                        {item.name_en}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-[#D7BFA4]">
                      {localizedName(locale, item.category)}
                    </td>
                    <td className="py-3 pr-4 text-[#F8EEDF]">
                      {formatPrice(locale, item.price)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        className={cn(
                          "rounded-md border text-xs",
                          item.available
                            ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
                            : "border-white/10 bg-white/8 text-[#B99C7D]",
                        )}
                      >
                        {item.available ? copy.active : copy.inactive}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={copy.delete}
                        className="h-8 w-8 rounded-md text-red-200 hover:bg-red-500/10"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-sm text-[#D7BFA4]"
                  >
                    {copy.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open);
          if (!open) setCategoryForm(emptyCategoryForm(ownerLanguage));
        }}
      >
        <DialogContent className="rounded-lg border-white/10 bg-[#20130D]/95 text-[#F8EEDF] shadow-2xl backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {categoryForm.id ? copy.editCategory : copy.createCategory}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
              <label className="space-y-2 text-sm font-medium">
                <span>{copy.primaryLanguage}</span>
                <Select
                  value={categoryForm.primaryLanguage}
                  onValueChange={(value) =>
                    setCategoryForm((current) => ({
                      ...current,
                      primaryLanguage: value as PrimaryLanguage,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{copy.english}</SelectItem>
                    <SelectItem value="ja">{copy.japanese}</SelectItem>
                    <SelectItem value="vi">{copy.vietnamese}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>{copy.categoryName}</span>
                <Input
                  value={categoryForm.primaryName}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      primaryName: event.target.value,
                    }))
                  }
                  className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["name_en", copy.english],
                ["name_ja", copy.japanese],
                ["name_vi", copy.vietnamese],
              ].map(([field, label]) => (
                <label key={field} className="space-y-2 text-sm font-medium">
                  <span>{label}</span>
                  <Input
                    value={categoryForm[field as keyof CategoryFormState] as string}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                  />
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg text-[#F8EEDF] hover:bg-white/10"
              onClick={() => setIsCategoryDialogOpen(false)}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              onClick={saveCategory}
              disabled={isSavingCategory}
              className="rounded-lg bg-[#F5B76D] text-[#23160E] hover:bg-[#FFD08B]"
            >
              {isSavingCategory ? copy.saving : copy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPresetDialogOpen}
        onOpenChange={(open) => {
          setIsPresetDialogOpen(open);
          if (!open) setSelectedPresetKeys([]);
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-hidden rounded-lg border-white/10 bg-[#20130D]/95 p-0 text-[#F8EEDF] shadow-2xl backdrop-blur-xl sm:max-w-3xl">
          <DialogHeader className="border-b border-white/10 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <DialogTitle>{copy.categorySetTitle}</DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-white/10 bg-white/8 text-[#F8EEDF] hover:bg-white/14"
                  onClick={smartPickPresets}
                >
                  <WandSparkles className="mr-1.5 h-3.5 w-3.5" />
                  {copy.smartPick}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md text-[#F8EEDF] hover:bg-white/10"
                  onClick={() =>
                    setSelectedPresetKeys(
                      availablePresets.map((preset) => preset.key),
                    )
                  }
                >
                  {copy.selectAll}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md text-[#F8EEDF] hover:bg-white/10"
                  onClick={() => setSelectedPresetKeys([])}
                >
                  {copy.clear}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[58vh] overflow-y-auto px-4 py-3">
            <div className="overflow-hidden rounded-lg border border-white/10">
              <div className="hidden bg-black/20 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#B99C7D] sm:grid sm:grid-cols-[0.35fr_1.2fr_1fr_1fr]">
                <span />
                <span>{copy.english}</span>
                <span>{copy.japanese}</span>
                <span>{copy.vietnamese}</span>
              </div>
              <div className="divide-y divide-white/10">
                {availablePresets.length > 0 ? (
                  availablePresets.map((preset) => {
                    const selected = selectedPresetKeys.includes(preset.key);
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => togglePreset(preset.key)}
                        className={cn(
                          "grid w-full gap-2 px-3 py-3 text-left text-sm transition sm:grid-cols-[0.35fr_1.2fr_1fr_1fr] sm:items-center",
                          selected ? "bg-[#F5B76D]/14" : "hover:bg-white/8",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border",
                            selected
                              ? "border-[#F5B76D] bg-[#F5B76D] text-[#23160E]"
                              : "border-white/20 bg-black/20",
                          )}
                        >
                          {selected ? (
                            <span className="h-2 w-2 rounded-sm bg-[#23160E]" />
                          ) : null}
                        </span>
                        <span className="font-medium text-[#FFF8EE]">
                          {preset.name_en}
                        </span>
                        <span className="text-[#D7BFA4]">
                          {preset.name_ja}
                        </span>
                        <span className="text-[#D7BFA4]">
                          {preset.name_vi}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-sm text-[#D7BFA4]">
                    {copy.noData}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-white/10 px-4 py-3">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-[#D7BFA4]">
                {selectedPresetKeys.length} {copy.selected}
              </span>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-lg text-[#F8EEDF] hover:bg-white/10"
                  onClick={() => setIsPresetDialogOpen(false)}
                >
                  {copy.cancel}
                </Button>
                <Button
                  type="button"
                  disabled={
                    selectedPresetKeys.length === 0 || isCreatingPresets
                  }
                  onClick={createSelectedPresets}
                  className="rounded-lg bg-[#F5B76D] text-[#23160E] hover:bg-[#FFD08B]"
                >
                  {isCreatingPresets ? copy.saving : copy.addSelected}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MenuItemCreationWizard
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        mode="organization-shared"
        categories={activeCategories.map((category) => ({
          id: category.id,
          name_en: category.name_en,
          name_ja: category.name_ja,
          name_vi: category.name_vi,
          source: "organization",
          itemCount: category.items.length,
        }))}
        ownerLanguage={ownerLanguage}
        locale={locale}
        organizationName={organizationName ?? null}
        onCreated={refresh}
      />
    </section>
  );
}

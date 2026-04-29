"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import {
  BarChart3,
  Eye,
  EyeOff,
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
import { createClient } from "@/lib/supabase/client";
import { optimizeMenuImageFile } from "@/lib/client/menu-image-processing";
import type {
  OrganizationMenuInsights,
  OrganizationSharedMenuCategory,
  OrganizationSharedMenuItem,
} from "@/lib/server/organizations/shared-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  is_active: boolean;
};

type ItemEditFormState = {
  id: string;
  category_id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  description_en: string;
  description_ja: string;
  description_vi: string;
  price: string;
  image_url: string;
  available: boolean;
  stock_level: string;
  weekday_visibility: number[];
  useSizes: boolean;
  sizes: ItemSizeEditFormState[];
  toppings: ItemToppingEditFormState[];
};

type ItemSizeEditFormState = {
  id: string;
  size_key: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: string;
};

type ItemToppingEditFormState = {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: string;
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
      allBranches: "全店舗",
      last30Days: "直近30日",
      showTop: "表示数",
      active: "有効",
      activeCategory: "有効カテゴリ",
      availableItem: "販売中",
      hiddenItem: "非表示",
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
      addCategoryChoice: "カテゴリ追加",
      manualCategory: "手入力",
      defaultCategory: "標準から選択",
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
      itemActivated: "メニューを表示しました。",
      itemDeactivated: "メニューを非表示にしました。",
      required: "カテゴリ名が必要です。",
      failed: "保存できませんでした。",
      deleteConfirm: "このカテゴリを削除しますか？",
      edit: "編集",
      editItem: "メニュー編集",
      deactivate: "非表示",
      activate: "表示",
      delete: "削除",
      descriptions: "説明",
      image: "画像",
      imageUrl: "画像URL",
      stock: "在庫",
      schedule: "曜日",
      chooseImage: "画像を選択",
      cropImage: "画像を調整",
      applyImage: "画像を適用",
      zoom: "ズーム",
      horizontal: "左右",
      vertical: "上下",
      sizes: "サイズ",
      useSizes: "サイズを使う",
      toppings: "トッピング",
      addTopping: "トッピング追加",
      addSize: "サイズ追加",
      sizeKey: "キー",
      small: "小サイズ",
      medium: "中サイズ",
      large: "大サイズ",
      weekdays: ["月", "火", "水", "木", "金", "土", "日"],
    };
  }

  if (language === "vi") {
    return {
      title: "Thực đơn",
      addCategory: "Danh mục",
      categorySet: "Bộ danh mục",
      addItem: "Thêm món",
      allBranches: "Tất cả chi nhánh",
      last30Days: "30 ngày gần nhất",
      showTop: "Số món",
      active: "Đang dùng",
      activeCategory: "Danh mục đang dùng",
      availableItem: "Đang bán",
      hiddenItem: "Đang ẩn",
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
      addCategoryChoice: "Thêm danh mục",
      manualCategory: "Nhập tay",
      defaultCategory: "Chọn mẫu",
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
      itemActivated: "Đã hiện món.",
      itemDeactivated: "Đã tạm ẩn món.",
      required: "Cần tên danh mục.",
      failed: "Không thể lưu.",
      deleteConfirm: "Xóa danh mục này?",
      edit: "Sửa",
      editItem: "Sửa món",
      deactivate: "Ẩn món",
      activate: "Hiện món",
      delete: "Xóa",
      descriptions: "Mô tả",
      image: "Hình ảnh",
      imageUrl: "Link hình ảnh",
      stock: "Tồn kho",
      schedule: "Ngày bán",
      chooseImage: "Chọn ảnh",
      cropImage: "Căn hình ảnh",
      applyImage: "Dùng hình này",
      zoom: "Phóng to",
      horizontal: "Ngang",
      vertical: "Dọc",
      sizes: "Kích cỡ",
      useSizes: "Dùng kích cỡ",
      toppings: "Topping",
      addTopping: "Thêm topping",
      addSize: "Thêm kích cỡ",
      sizeKey: "Mã",
      small: "Nhỏ",
      medium: "Vừa",
      large: "Lớn",
      weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    };
  }

  return {
    title: "Menu",
    addCategory: "Category",
    categorySet: "Category set",
    addItem: "Add item",
    allBranches: "All branches",
    last30Days: "Last 30 days",
    showTop: "Show",
    active: "Active",
    activeCategory: "Active category",
    availableItem: "Selling",
    hiddenItem: "Hidden",
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
    addCategoryChoice: "Add category",
    manualCategory: "Manual",
    defaultCategory: "Pick default",
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
    itemActivated: "Item shown.",
    itemDeactivated: "Item hidden.",
    required: "Category name is required.",
    failed: "Could not save.",
    deleteConfirm: "Delete this category?",
    edit: "Edit",
    editItem: "Edit item",
    deactivate: "Hide",
    activate: "Show",
    delete: "Delete",
    descriptions: "Descriptions",
    image: "Image",
    imageUrl: "Image URL",
    stock: "Stock",
    schedule: "Days",
    chooseImage: "Choose image",
    cropImage: "Crop image",
    applyImage: "Use image",
    zoom: "Zoom",
    horizontal: "Horizontal",
    vertical: "Vertical",
    sizes: "Sizes",
    useSizes: "Use sizes",
    toppings: "Toppings",
    addTopping: "Add topping",
    addSize: "Add size",
    sizeKey: "Key",
    small: "Small",
    medium: "Medium",
    large: "Large",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
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
    is_active: true,
  };
}

function optionId() {
  return crypto.randomUUID();
}

function defaultItemSizes(basePrice: string) {
  return [
    {
      id: optionId(),
      size_key: "S",
      name_en: "Small",
      name_ja: "小サイズ",
      name_vi: "Nhỏ",
      price: "",
    },
    {
      id: optionId(),
      size_key: "M",
      name_en: "Medium",
      name_ja: "中サイズ",
      name_vi: "Vừa",
      price: basePrice,
    },
    {
      id: optionId(),
      size_key: "L",
      name_en: "Large",
      name_ja: "大サイズ",
      name_vi: "Lớn",
      price: "",
    },
  ];
}

export function ControlSharedMenuPanel({
  categories,
  insights,
  organizationName,
  locale,
}: ControlSharedMenuPanelProps) {
  const router = useRouter();
  const supabase = createClient();
  const copy = useMemo(() => buildCopy(locale), [locale]);
  const ownerLanguage = localeToPrimaryLanguage(locale);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemEditDialogOpen, setIsItemEditDialogOpen] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [savingAvailabilityItemId, setSavingAvailabilityItemId] = useState<string | null>(null);
  const [topSellerLimit, setTopSellerLimit] = useState("5");
  const [isCreatingPresets, setIsCreatingPresets] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CategoryStatusFilter>("all");
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(
    emptyCategoryForm(ownerLanguage),
  );
  const [itemForm, setItemForm] = useState<ItemEditFormState | null>(null);
  const [selectedPresetKeys, setSelectedPresetKeys] = useState<string[]>([]);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

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
  const visibleTopItems = insights.topItems.slice(0, Number(topSellerLimit));
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

  const openCategoryChoice = () => {
    setSelectedPresetKeys([]);
    setIsPresetDialogOpen(true);
  };

  const openEditCategory = (category: OrganizationSharedMenuCategory) => {
    setCategoryForm({
      id: category.id,
      primaryName: localizedName(locale, category),
      primaryLanguage: ownerLanguage,
      name_en: category.name_en,
      name_ja: category.name_ja ?? "",
      name_vi: category.name_vi ?? "",
      is_active: category.is_active,
    });
    setIsCategoryDialogOpen(true);
  };

  const openEditItem = (item: OrganizationSharedMenuItem) => {
    const itemPrice = String(item.price);
    setItemForm({
      id: item.id,
      category_id: item.category_id,
      name_en: item.name_en,
      name_ja: item.name_ja ?? "",
      name_vi: item.name_vi ?? "",
      description_en: item.description_en ?? "",
      description_ja: item.description_ja ?? "",
      description_vi: item.description_vi ?? "",
      price: itemPrice,
      image_url: item.image_url ?? "",
      available: item.available,
      stock_level: item.stock_level === null ? "" : String(item.stock_level),
      weekday_visibility: item.weekday_visibility?.length
        ? item.weekday_visibility
        : [1, 2, 3, 4, 5, 6, 7],
      useSizes: item.sizes.length > 0,
      sizes:
        item.sizes.length > 0
          ? [...item.sizes]
              .sort((a, b) => a.position - b.position)
              .map((size) => ({
                id: size.id,
                size_key: size.size_key,
                name_en: size.name_en,
                name_ja: size.name_ja ?? "",
                name_vi: size.name_vi ?? "",
                price: String(size.price),
              }))
          : defaultItemSizes(itemPrice),
      toppings: [...item.toppings]
        .sort((a, b) => a.position - b.position)
        .map((topping) => ({
          id: topping.id,
          name_en: topping.name_en,
          name_ja: topping.name_ja ?? "",
          name_vi: topping.name_vi ?? "",
          price: String(topping.price),
        })),
    });
    setIsItemEditDialogOpen(true);
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
            is_active: categoryForm.is_active,
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

  const saveItem = async () => {
    if (!itemForm || !itemForm.name_en.trim()) {
      toast.error(copy.required);
      return;
    }

    setIsSavingItem(true);
    try {
      const response = await fetch(
        `/api/v1/owner/organization/shared-menu/items/${itemForm.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: itemForm.category_id,
            name_en: itemForm.name_en.trim(),
            name_ja: itemForm.name_ja.trim(),
            name_vi: itemForm.name_vi.trim(),
            description_en: itemForm.description_en.trim(),
            description_ja: itemForm.description_ja.trim(),
            description_vi: itemForm.description_vi.trim(),
            price: Number(itemForm.price || 0),
            image_url: itemForm.image_url.trim() || null,
            available: itemForm.available,
            stock_level:
              itemForm.stock_level.trim() === ""
                ? null
                : Number(itemForm.stock_level || 0),
            weekday_visibility: itemForm.weekday_visibility,
            sizes: itemForm.useSizes
              ? itemForm.sizes
                  .filter((size) => size.size_key.trim() && size.name_en.trim())
                  .map((size, index) => ({
                    size_key: size.size_key.trim(),
                    name_en: size.name_en.trim(),
                    name_ja: size.name_ja.trim(),
                    name_vi: size.name_vi.trim(),
                    price: Number(size.price || 0),
                    position: index,
                  }))
              : [],
            toppings: itemForm.toppings
              .filter((topping) => topping.name_en.trim())
              .map((topping, index) => ({
                name_en: topping.name_en.trim(),
                name_ja: topping.name_ja.trim(),
                name_vi: topping.name_vi.trim(),
                price: Number(topping.price || 0),
                position: index,
              })),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? copy.failed);

      toast.success(copy.updated);
      setIsItemEditDialogOpen(false);
      setItemForm(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    } finally {
      setIsSavingItem(false);
    }
  };

  const toggleItemAvailability = async (
    item: OrganizationSharedMenuItem,
    available: boolean,
  ) => {
    setSavingAvailabilityItemId(item.id);
    try {
      const response = await fetch(
        `/api/v1/owner/organization/shared-menu/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? copy.failed);
      toast.success(available ? copy.itemActivated : copy.itemDeactivated);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    } finally {
      setSavingAvailabilityItemId(null);
    }
  };

  const handleEditImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
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

  const applyEditImageCrop = async () => {
    if (!sourceImageFile) return;
    setIsProcessingImage(true);
    try {
      const optimized = await optimizeMenuImageFile(sourceImageFile, {
        zoom: cropZoom,
        offsetX: cropOffsetX,
        offsetY: cropOffsetY,
      });
      const sessionResponse = await fetch("/api/v1/auth/session");
      const sessionData = await sessionResponse.json();
      if (!sessionData.authenticated) throw new Error(copy.failed);

      const filePath = `restaurants/shared-menu/menu_items/${Date.now()}-${optimized.file.name}`;
      const { error } = await supabase.storage
        .from("restaurant-uploads")
        .upload(filePath, optimized.file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw new Error(error.message);

      const publicUrl = supabase.storage
        .from("restaurant-uploads")
        .getPublicUrl(filePath).data.publicUrl;
      setItemForm((current) =>
        current ? { ...current, image_url: publicUrl } : current,
      );
      setIsCropDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    } finally {
      setIsProcessingImage(false);
    }
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

  return (
    <section className="space-y-4 text-[#F8EEDF]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {copy.title}
          </h1>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row">
          <Button
            type="button"
            onClick={() => router.push(`/${locale}/control/menu/new`)}
            disabled={activeCategories.length === 0}
            className="h-10 rounded-lg bg-[#F5B76D] text-[#23160E] hover:bg-[#FFD08B]"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {copy.addItem}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                {copy.topItems}
              </h2>
              <p className="mt-1 text-xs text-[#B99C7D]">
                {copy.allBranches} · {copy.last30Days}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="rounded-md border-white/10 bg-white/10 text-[#F8EEDF] hover:bg-white/10">
                {insights.feedbackCount} {copy.feedback}
              </Badge>
              <Select value={topSellerLimit} onValueChange={setTopSellerLimit}>
                <SelectTrigger className="h-8 w-24 rounded-md border-white/10 bg-black/20 text-xs text-[#F8EEDF]">
                  <span>
                    {copy.showTop} {topSellerLimit}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{copy.showTop} 5</SelectItem>
                  <SelectItem value="10">{copy.showTop} 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {visibleTopItems.length > 0 ? (
              visibleTopItems.map((item) => (
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
            <div className="grid gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                onClick={openCategoryChoice}
                className="h-9 rounded-lg border-white/15 bg-white/8 text-[#F8EEDF] hover:bg-white/14"
              >
                <Plus className="mr-2 h-4 w-4" />
                {copy.addCategory}
              </Button>
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
                  <span>
                    {statusFilter === "active"
                      ? copy.active
                      : statusFilter === "inactive"
                        ? copy.inactive
                        : copy.all}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.all}</SelectItem>
                  <SelectItem value="active">{copy.active}</SelectItem>
                  <SelectItem value="inactive">{copy.inactive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 max-h-[420px] overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-black/20 text-xs uppercase tracking-[0.12em] text-[#B99C7D]">
                <tr>
                  <th className="px-3 py-2 font-medium">{copy.name}</th>
                  <th className="px-3 py-2 font-medium">{copy.count}</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">
                    {copy.status}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {copy.action}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="align-middle"
                  >
                    <td className="min-w-0 px-3 py-3">
                      <p className="whitespace-normal break-words font-medium leading-5 text-[#FFF8EE]">
                        {localizedName(locale, category)}
                      </p>
                      <p className="mt-1 whitespace-normal break-words text-xs leading-4 text-[#B99C7D]">
                        {[category.name_en, category.name_ja, category.name_vi]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[#D7BFA4]">
                      {category.items.length}
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
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
                    </td>
                    <td className="px-3 py-3 text-right">
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-sm text-[#D7BFA4]"
                  >
                    {copy.noData}
                  </td>
                </tr>
              )}
              </tbody>
            </table>
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
        <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-[#B99C7D]">
              <tr>
                <th className="px-3 py-2 font-medium">{copy.name}</th>
                <th className="px-3 py-2 font-medium">{copy.categoryList}</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  {copy.price}
                </th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  {copy.status}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {copy.action}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-[48vw] px-3 py-3 sm:max-w-[240px]">
                      <p className="truncate font-medium text-[#FFF8EE]">
                        {localizedName(locale, item)}
                      </p>
                      <p className="hidden truncate text-xs text-[#B99C7D] sm:block">
                        {item.name_en}
                      </p>
                    </td>
                    <td className="max-w-[30vw] truncate px-3 py-3 text-[#D7BFA4] sm:max-w-none">
                      {localizedName(locale, item.category)}
                    </td>
                    <td className="hidden px-3 py-3 text-[#F8EEDF] sm:table-cell">
                      {formatPrice(locale, item.price)}
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      <Badge
                        className={cn(
                          "rounded-md border text-xs",
                          item.available
                            ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
                            : "border-white/10 bg-white/8 text-[#B99C7D]",
                        )}
                      >
                        {item.available ? copy.availableItem : copy.hiddenItem}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          title={item.available ? copy.deactivate : copy.activate}
                          className={cn(
                            "h-8 rounded-md border-white/10 bg-white/8 px-2 text-xs hover:bg-white/14",
                            item.available ? "text-[#D7BFA4]" : "text-emerald-200",
                          )}
                          disabled={savingAvailabilityItemId === item.id}
                          onClick={() =>
                            toggleItemAvailability(item, !item.available)
                          }
                        >
                          {item.available ? (
                            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          <span>{item.available ? copy.deactivate : copy.activate}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title={copy.edit}
                          className="h-8 w-8 rounded-md text-[#F8EEDF] hover:bg-white/10"
                          onClick={() => openEditItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
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

            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm font-medium">
              <span>{copy.activeCategory}</span>
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(checked) =>
                  setCategoryForm((current) => ({
                    ...current,
                    is_active: checked,
                  }))
                }
              />
            </label>
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
        open={isItemEditDialogOpen}
        onOpenChange={(open) => {
          setIsItemEditDialogOpen(open);
          if (!open) setItemForm(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-lg border-white/10 bg-[#20130D]/95 text-[#F8EEDF] shadow-2xl backdrop-blur-xl sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{copy.editItem}</DialogTitle>
          </DialogHeader>

          {itemForm ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                    <label className="space-y-2 text-sm font-medium">
                      <span>{copy.categoryList}</span>
                      <Select
                        value={itemForm.category_id}
                        onValueChange={(value) =>
                          setItemForm((current) =>
                            current ? { ...current, category_id: value } : current,
                          )
                        }
                      >
                        <SelectTrigger className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {localizedName(locale, category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        ["name_en", copy.english],
                        ["name_ja", copy.japanese],
                        ["name_vi", copy.vietnamese],
                      ].map(([field, label]) => (
                        <label key={field} className="space-y-2 text-sm font-medium">
                          <span>{label}</span>
                          <Input
                            value={
                              itemForm[field as keyof ItemEditFormState] as string
                            }
                            onChange={(event) =>
                              setItemForm((current) =>
                                current
                                  ? { ...current, [field]: event.target.value }
                                  : current,
                              )
                            }
                            className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                    <h3 className="text-sm font-semibold text-white">
                      {copy.descriptions}
                    </h3>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {[
                        ["description_en", copy.english],
                        ["description_ja", copy.japanese],
                        ["description_vi", copy.vietnamese],
                      ].map(([field, label]) => (
                        <label key={field} className="space-y-2 text-sm font-medium">
                          <span>{label}</span>
                          <Textarea
                            value={
                              itemForm[field as keyof ItemEditFormState] as string
                            }
                            onChange={(event) =>
                              setItemForm((current) =>
                                current
                                  ? { ...current, [field]: event.target.value }
                                  : current,
                              )
                            }
                            rows={4}
                            className="rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                    <div className="grid gap-3">
                      <label className="space-y-2 text-sm font-medium">
                        <span>{copy.price}</span>
                        <Input
                          type="number"
                          min="0"
                          value={itemForm.price}
                          onChange={(event) =>
                            setItemForm((current) =>
                              current
                                ? { ...current, price: event.target.value }
                                : current,
                            )
                          }
                          className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm font-medium">
                        <span>{copy.availableItem}</span>
                        <Switch
                          checked={itemForm.available}
                          onCheckedChange={(checked) =>
                            setItemForm((current) =>
                              current
                                ? { ...current, available: checked }
                                : current,
                            )
                          }
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>{copy.stock}</span>
                        <Input
                          type="number"
                          min="0"
                          value={itemForm.stock_level}
                          onChange={(event) =>
                            setItemForm((current) =>
                              current
                                ? { ...current, stock_level: event.target.value }
                                : current,
                            )
                          }
                          className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                        />
                      </label>

                      <div className="space-y-2 text-sm font-medium">
                        <span>{copy.schedule}</span>
                        <div className="flex flex-wrap gap-2">
                          {copy.weekdays.map((weekday, index) => {
                            const dayValue = index + 1;
                            const selected =
                              itemForm.weekday_visibility.includes(dayValue);
                            return (
                              <button
                                key={weekday}
                                type="button"
                                className={cn(
                                  "h-9 rounded-lg border px-3 text-sm transition-colors",
                                  selected
                                    ? "border-[#F5B76D] bg-[#F5B76D]/20 text-[#FFE8C4]"
                                    : "border-white/10 bg-black/20 text-[#D7BFA4] hover:bg-white/10",
                                )}
                                onClick={() =>
                                  setItemForm((current) => {
                                    if (!current) return current;
                                    const nextDays = selected
                                      ? current.weekday_visibility.filter(
                                          (day) => day !== dayValue,
                                        )
                                      : [...current.weekday_visibility, dayValue];
                                    return {
                                      ...current,
                                      weekday_visibility: nextDays.sort(
                                        (a, b) => a - b,
                                      ),
                                    };
                                  })
                                }
                              >
                                {weekday}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{copy.image}</p>
                      <label className="cursor-pointer">
                        <span className="inline-flex h-9 items-center rounded-lg border border-white/15 bg-white/8 px-3 text-sm font-medium text-[#F8EEDF] hover:bg-white/14">
                          {copy.chooseImage}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleEditImageSelect}
                        />
                      </label>
                    </div>
                    {itemForm.image_url ? (
                      <div className="mt-3 aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={itemForm.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <label className="mt-3 block space-y-2 text-sm font-medium">
                      <span>{copy.imageUrl}</span>
                      <Input
                        value={itemForm.image_url}
                        onChange={(event) =>
                          setItemForm((current) =>
                            current
                              ? { ...current, image_url: event.target.value }
                              : current,
                          )
                        }
                        className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">{copy.sizes}</h3>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <span>{copy.useSizes}</span>
                    <Switch
                      checked={itemForm.useSizes}
                      onCheckedChange={(checked) =>
                        setItemForm((current) =>
                          current
                            ? {
                                ...current,
                                useSizes: checked,
                                sizes:
                                  checked && current.sizes.length === 0
                                    ? defaultItemSizes(current.price)
                                    : current.sizes,
                              }
                            : current,
                        )
                      }
                    />
                  </label>
                </div>

                {itemForm.useSizes ? (
                  <div className="mt-3 space-y-3">
                    {itemForm.sizes.map((size, index) => (
                      <div
                        key={size.id}
                        className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 lg:grid-cols-[0.7fr_1fr_1fr_1fr_0.7fr_auto]"
                      >
                        <label className="space-y-2 text-sm font-medium">
                          <span>{copy.sizeKey}</span>
                          <Select
                            value={size.size_key}
                            onValueChange={(value) =>
                              setItemForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      sizes: current.sizes.map((entry, entryIndex) =>
                                        entryIndex === index
                                          ? { ...entry, size_key: value }
                                          : entry,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          >
                            <SelectTrigger className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["S", "M", "L", "XL"].map((key) => (
                                <SelectItem key={key} value={key}>
                                  {key}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        {[
                          ["name_en", copy.english],
                          ["name_ja", copy.japanese],
                          ["name_vi", copy.vietnamese],
                        ].map(([field, label]) => (
                          <label key={field} className="space-y-2 text-sm font-medium">
                            <span>{label}</span>
                            <Input
                              value={size[field as keyof ItemSizeEditFormState]}
                              onChange={(event) =>
                                setItemForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        sizes: current.sizes.map(
                                          (entry, entryIndex) =>
                                            entryIndex === index
                                              ? {
                                                  ...entry,
                                                  [field]: event.target.value,
                                                }
                                              : entry,
                                        ),
                                      }
                                    : current,
                                )
                              }
                              className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                            />
                          </label>
                        ))}
                        <label className="space-y-2 text-sm font-medium">
                          <span>{copy.price}</span>
                          <Input
                            type="number"
                            min="0"
                            value={size.price}
                            onChange={(event) =>
                              setItemForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      sizes: current.sizes.map((entry, entryIndex) =>
                                        entryIndex === index
                                          ? { ...entry, price: event.target.value }
                                          : entry,
                                      ),
                                    }
                                  : current,
                              )
                            }
                            className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                          />
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="self-end rounded-md text-red-200 hover:bg-red-500/10"
                          onClick={() =>
                            setItemForm((current) =>
                              current
                                ? {
                                    ...current,
                                    sizes: current.sizes.filter(
                                      (_, entryIndex) => entryIndex !== index,
                                    ),
                                  }
                                : current,
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg border-white/15 bg-white/8 text-[#F8EEDF] hover:bg-white/14"
                      onClick={() =>
                        setItemForm((current) =>
                          current
                            ? {
                                ...current,
                                sizes: [
                                  ...current.sizes,
                                  {
                                    id: optionId(),
                                    size_key: "L",
                                    name_en: "Large",
                                    name_ja: "大サイズ",
                                    name_vi: "Lớn",
                                    price: current.price,
                                  },
                                ],
                              }
                            : current,
                        )
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {copy.addSize}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">{copy.toppings}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-white/15 bg-white/8 text-[#F8EEDF] hover:bg-white/14"
                    onClick={() =>
                      setItemForm((current) =>
                        current
                          ? {
                              ...current,
                              toppings: [
                                ...current.toppings,
                                {
                                  id: optionId(),
                                  name_en: "",
                                  name_ja: "",
                                  name_vi: "",
                                  price: "0",
                                },
                              ],
                            }
                          : current,
                      )
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {copy.addTopping}
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {itemForm.toppings.map((topping, index) => (
                    <div
                      key={topping.id}
                      className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 lg:grid-cols-[1fr_1fr_1fr_0.7fr_auto]"
                    >
                      {[
                        ["name_en", copy.english],
                        ["name_ja", copy.japanese],
                        ["name_vi", copy.vietnamese],
                      ].map(([field, label]) => (
                        <label key={field} className="space-y-2 text-sm font-medium">
                          <span>{label}</span>
                          <Input
                            value={topping[field as keyof ItemToppingEditFormState]}
                            onChange={(event) =>
                              setItemForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      toppings: current.toppings.map(
                                        (entry, entryIndex) =>
                                          entryIndex === index
                                            ? {
                                                ...entry,
                                                [field]: event.target.value,
                                              }
                                            : entry,
                                      ),
                                    }
                                  : current,
                              )
                            }
                            className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                          />
                        </label>
                      ))}
                      <label className="space-y-2 text-sm font-medium">
                        <span>{copy.price}</span>
                        <Input
                          type="number"
                          min="0"
                          value={topping.price}
                          onChange={(event) =>
                            setItemForm((current) =>
                              current
                                ? {
                                    ...current,
                                    toppings: current.toppings.map(
                                      (entry, entryIndex) =>
                                        entryIndex === index
                                          ? { ...entry, price: event.target.value }
                                          : entry,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className="h-10 rounded-lg border-white/10 bg-black/20 text-[#F8EEDF]"
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="self-end rounded-md text-red-200 hover:bg-red-500/10"
                        onClick={() =>
                          setItemForm((current) =>
                            current
                              ? {
                                  ...current,
                                  toppings: current.toppings.filter(
                                    (_, entryIndex) => entryIndex !== index,
                                  ),
                                }
                              : current,
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg text-[#F8EEDF] hover:bg-white/10"
              onClick={() => setIsItemEditDialogOpen(false)}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              onClick={saveItem}
              disabled={isSavingItem || !itemForm}
              className="rounded-lg bg-[#F5B76D] text-[#23160E] hover:bg-[#FFD08B]"
            >
              {isSavingItem ? copy.saving : copy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="rounded-lg border-white/10 bg-[#20130D]/95 text-[#F8EEDF] shadow-2xl backdrop-blur-xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{copy.cropImage}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-[#F5B76D]/30 bg-[#120C08]">
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
                ) : null}
              </div>
            </div>
            <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
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
              className="rounded-lg bg-[#F5B76D] text-[#23160E] hover:bg-[#FFD08B]"
              onClick={applyEditImageCrop}
              disabled={!sourceImagePreview || isProcessingImage}
            >
              {isProcessingImage ? copy.saving : copy.applyImage}
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
              <DialogTitle>{copy.addCategoryChoice}</DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-white/10 bg-white/8 text-[#F8EEDF] hover:bg-white/14"
                  onClick={() => {
                    setIsPresetDialogOpen(false);
                    openCreateCategory();
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {copy.manualCategory}
                </Button>
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

          <div className="border-b border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#B99C7D]">
            {copy.defaultCategory}
          </div>

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

    </section>
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
        <span className="text-xs text-[#B99C7D]">
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
        className="h-2 w-full cursor-pointer accent-[#F5B76D]"
      />
    </label>
  );
}

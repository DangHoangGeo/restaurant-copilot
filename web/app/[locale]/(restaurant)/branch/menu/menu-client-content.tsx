"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { optimizeMenuImageFile } from "@/lib/client/menu-image-processing";
import { cn, formatCurrency, getLocalizedText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MenuSkeleton } from "@/components/ui/skeletons";
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
import {
  ItemModal,
  type StreamlinedMenuItemFormData,
} from "@/components/features/admin/menu/ItemModal";
import { MenuItemCreationWizard } from "@/components/features/admin/menu/MenuItemCreationWizard";
import type { MenuItemCategory, MenuItem } from "@/shared/types/menu";

type PrimaryLanguage = "en" | "ja" | "vi";
type SourceFilter = "all" | "organization" | "branch";

interface WorkspaceSize {
  id?: string;
  size_key: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  price: number;
  position: number;
}

interface WorkspaceTopping {
  id?: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  price: number;
  position: number;
}

interface WorkspaceItem {
  id: string;
  category_id: string;
  organization_menu_item_id: string | null;
  source: "organization" | "branch";
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  price: number;
  image_url?: string | null;
  available: boolean;
  weekday_visibility: number[];
  stock_level?: number | null;
  position: number;
  sizes: WorkspaceSize[];
  toppings: WorkspaceTopping[];
}

interface WorkspaceCategory {
  id: string;
  organization_menu_category_id: string | null;
  source: "organization" | "branch";
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  position: number;
  menu_items: WorkspaceItem[];
}

interface WorkspaceSummary {
  totalCategories: number;
  totalItems: number;
  inheritedCategories: number;
  inheritedItems: number;
  localCategories: number;
  localItems: number;
}

interface WorkspaceResponse {
  branch: {
    id: string;
    name: string;
    subdomain: string;
  };
  organization: {
    id: string;
    name: string;
  } | null;
  categories: WorkspaceCategory[];
  summary: WorkspaceSummary;
}

interface MenuClientContentProps {
  branchId: string;
}

function buildCopy(locale: string) {
  if (locale === "ja") {
    return {
      title: "支店メニュー",
      categories: "カテゴリ",
      allCategories: "すべてのカテゴリ",
      inherited: "会社継承",
      local: "支店ローカル",
      totalItems: "全メニュー",
      missingImages: "画像未設定",
      searchPlaceholder: "料理名、カテゴリ名で検索",
      newItem: "新しいメニューを作成",
      newCategory: "カテゴリを追加",
      refresh: "更新",
      missingOnly: "画像未設定のみ",
      all: "すべて",
      companyOnly: "会社継承",
      branchOnly: "支店ローカル",
      companyManaged: "会社管理",
      branchManaged: "支店管理",
      managedHint: "会社側で編集",
      empty: "まだ表示できるメニューがありません。",
      createCategoryTitle: "新しいカテゴリを追加",
      editCategoryTitle: "カテゴリを編集",
      categoryRequired: "カテゴリ名を入力してください。",
      categoryName: "カテゴリ名",
      categoryPlaceholder: "前菜、メイン、ドリンク",
      primaryLanguage: "入力言語",
      categorySaved: "カテゴリを追加しました。",
      categoryUpdated: "カテゴリを更新しました。",
      deleteItemConfirm: "この支店メニューを削除しますか？",
      deleteCategoryConfirm: "この空のカテゴリを削除しますか？",
      unavailable: "非表示",
      available: "表示中",
      missingImage: "画像未設定",
      remove: "削除",
      edit: "編集",
      hide: "非表示",
      show: "表示",
      save: "保存",
      itemCount: "件",
    };
  }

  if (locale === "vi") {
    return {
      title: "Thực đơn chi nhánh",
      categories: "Danh mục",
      allCategories: "Tất cả danh mục",
      inherited: "Kế thừa công ty",
      local: "Món riêng chi nhánh",
      totalItems: "Tổng món",
      missingImages: "Thiếu hình ảnh",
      searchPlaceholder: "Tìm theo tên món hoặc danh mục",
      newItem: "Tạo món mới",
      newCategory: "Thêm danh mục",
      refresh: "Tải lại",
      missingOnly: "Chỉ món thiếu ảnh",
      all: "Tất cả",
      companyOnly: "Kế thừa công ty",
      branchOnly: "Chỉ chi nhánh",
      companyManaged: "Quản lý bởi công ty",
      branchManaged: "Quản lý bởi chi nhánh",
      managedHint: "Chỉnh sửa ở cấp công ty",
      empty: "Chưa có món nào phù hợp với bộ lọc hiện tại.",
      createCategoryTitle: "Thêm danh mục mới",
      editCategoryTitle: "Sửa danh mục",
      categoryRequired: "Vui lòng nhập tên danh mục.",
      categoryName: "Tên danh mục",
      categoryPlaceholder: "Khai vị, món chính, đồ uống",
      primaryLanguage: "Ngôn ngữ nhập",
      categorySaved: "Đã thêm danh mục mới.",
      categoryUpdated: "Đã cập nhật danh mục.",
      deleteItemConfirm: "Xóa món cục bộ này khỏi chi nhánh?",
      deleteCategoryConfirm: "Xóa danh mục trống này?",
      unavailable: "Đang ẩn",
      available: "Đang hiển thị",
      missingImage: "Thiếu ảnh",
      remove: "Xóa",
      edit: "Sửa",
      hide: "Ẩn",
      show: "Hiện",
      save: "Lưu",
      itemCount: "món",
    };
  }

  return {
    title: "Branch menu",
    categories: "Categories",
    allCategories: "All categories",
    inherited: "Inherited",
    local: "Local",
    totalItems: "Total items",
    missingImages: "Missing images",
    searchPlaceholder: "Search items or categories",
    newItem: "Create new item",
    newCategory: "Add category",
    refresh: "Refresh",
    missingOnly: "Missing images only",
    all: "All",
    companyOnly: "Company inherited",
    branchOnly: "Branch local",
    companyManaged: "Managed by company",
    branchManaged: "Managed by branch",
    managedHint: "Edit at company level",
    empty: "No menu items match the current filters yet.",
    createCategoryTitle: "Add a new category",
    editCategoryTitle: "Edit category",
    categoryRequired: "Enter a category name.",
    categoryName: "Category name",
    categoryPlaceholder: "Starters, mains, drinks",
    primaryLanguage: "Input language",
    categorySaved: "Category added.",
    categoryUpdated: "Category updated.",
    deleteItemConfirm: "Delete this local branch item?",
    deleteCategoryConfirm: "Delete this empty local category?",
    unavailable: "Hidden",
    available: "Live",
    missingImage: "No image",
    remove: "Remove",
    edit: "Edit",
    hide: "Hide",
    show: "Show",
    save: "Save",
    itemCount: "items",
  };
}

function sourceBadgeClass(source: "organization" | "branch") {
  return source === "organization"
    ? "bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-100"
    : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/15";
}

function normalizeLocale(locale: string) {
  if (locale.startsWith("ja")) return "ja";
  if (locale.startsWith("vi")) return "vi";
  return "en";
}

function localizeEntry(
  entry: { name_en: string; name_ja?: string | null; name_vi?: string | null },
  locale: string,
) {
  return getLocalizedText(
    {
      name_en: entry.name_en,
      name_ja: entry.name_ja ?? undefined,
      name_vi: entry.name_vi ?? undefined,
    },
    locale,
  );
}

function localizeDescription(
  entry: {
    description_en?: string | null;
    description_ja?: string | null;
    description_vi?: string | null;
  },
  locale: string,
) {
  return getLocalizedText(
    {
      name_en: entry.description_en ?? undefined,
      name_ja: entry.description_ja ?? undefined,
      name_vi: entry.description_vi ?? undefined,
    },
    locale,
  );
}

function localeCode(locale: string) {
  if (locale === "vi") return "vi-VN";
  if (locale === "ja") return "ja-JP";
  return "en-US";
}

export function MenuClientContent({ branchId }: MenuClientContentProps) {
  const params = useParams();
  const router = useRouter();
  const locale = normalizeLocale((params.locale as string) || "en");
  const copy = useMemo(() => buildCopy(locale), [locale]);
  const ownerLanguage = locale as PrimaryLanguage;
  const supabase = createClient();

  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [showMissingImagesOnly, setShowMissingImagesOnly] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<WorkspaceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    primaryLanguage: ownerLanguage,
    primaryName: "",
    name_en: "",
    name_ja: "",
    name_vi: "",
  });
  const [editingItem, setEditingItem] = useState<WorkspaceItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const categoryOptions = useMemo<MenuItemCategory[]>(
    () =>
      (workspace?.categories ?? []).map((category) => ({
        id: category.id,
        name: localizeEntry(category, locale),
        name_en: category.name_en,
        name_ja: category.name_ja ?? undefined,
        name_vi: category.name_vi ?? undefined,
        position: category.position,
      })),
    [workspace?.categories, locale],
  );

  const loadWorkspace = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const response = await fetch(
          `/api/v1/owner/branch-menu/workspace?branchId=${encodeURIComponent(branchId)}`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load menu workspace");
        }

        const data = (await response.json()) as WorkspaceResponse;
        setWorkspace(data);
        setError(null);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load menu workspace",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [branchId],
  );

  useEffect(() => {
    loadWorkspace("initial");
  }, [loadWorkspace]);

  useEffect(() => {
    if (
      selectedCategoryId !== "all" &&
      !(workspace?.categories ?? []).some(
        (category) => category.id === selectedCategoryId,
      )
    ) {
      setSelectedCategoryId("all");
    }
  }, [workspace?.categories, selectedCategoryId]);

  const visibleCategories = useMemo(() => {
    const categories = workspace?.categories ?? [];

    return categories
      .filter(
        (category) =>
          selectedCategoryId === "all" || category.id === selectedCategoryId,
      )
      .map((category) => {
        const categoryMatches =
          searchTerm.trim().length === 0 ||
          localizeEntry(category, locale)
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const items = category.menu_items.filter((item) => {
          const sourceMatches =
            sourceFilter === "all" ||
            (sourceFilter === "organization" &&
              item.source === "organization") ||
            (sourceFilter === "branch" && item.source === "branch");
          const imageMatches = !showMissingImagesOnly || !item.image_url;

          const itemMatches =
            searchTerm.trim().length === 0 ||
            localizeEntry(item, locale)
              .toLowerCase()
              .includes(searchTerm.toLowerCase());

          return (
            sourceMatches && imageMatches && (categoryMatches || itemMatches)
          );
        });

        if (
          sourceFilter === "organization" &&
          category.source === "branch" &&
          items.length === 0
        ) {
          return null;
        }

        if (
          sourceFilter === "branch" &&
          category.source === "organization" &&
          items.length === 0
        ) {
          return null;
        }

        if (!categoryMatches && items.length === 0) {
          return null;
        }

        return {
          ...category,
          menu_items: items,
        };
      })
      .filter((category): category is WorkspaceCategory => Boolean(category));
  }, [
    workspace?.categories,
    selectedCategoryId,
    sourceFilter,
    searchTerm,
    locale,
    showMissingImagesOnly,
  ]);

  const missingImageCount = useMemo(
    () =>
      (workspace?.categories ?? []).reduce(
        (count, category) =>
          count + category.menu_items.filter((item) => !item.image_url).length,
        0,
      ),
    [workspace?.categories],
  );

  const handleTranslate = async (
    text: string,
    context: "item" | "topping" | "category",
  ) => {
    const response = await fetch("/api/v1/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, field: "name", context }),
    });

    if (!response.ok) {
      throw new Error("Translation failed");
    }

    return (await response.json()) as { en: string; ja: string; vi: string };
  };

  const handleGenerateDescription = async (
    text: string,
    initialData: string,
  ) => {
    const response = await fetch("/api/v1/ai/generate-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName: text,
        existingDescription: initialData,
        language: ownerLanguage,
        restaurantName: workspace?.branch.name,
        restaurantDescription: workspace?.organization?.name ?? "",
      }),
    });

    if (!response.ok) {
      throw new Error("Description generation failed");
    }

    return (await response.json()) as { en: string; ja: string; vi: string };
  };

  const handleGenerateAI = async (
    itemName: string,
    existingDescription: string,
  ) => {
    const response = await fetch("/api/v1/ai/generate-menu-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName,
        existingDescription,
        language: ownerLanguage,
        restaurantName: workspace?.branch.name,
        restaurantDescription: workspace?.organization?.name ?? "",
      }),
    });

    if (!response.ok) {
      throw new Error("AI generation failed");
    }

    const result = await response.json();
    return {
      name_en:
        ownerLanguage === "en"
          ? itemName || result.name_en
          : result.name_en || "",
      name_ja:
        ownerLanguage === "ja"
          ? itemName || result.name_ja
          : result.name_ja || "",
      name_vi:
        ownerLanguage === "vi"
          ? itemName || result.name_vi
          : result.name_vi || "",
      description_en: result.description_en || "",
      description_ja: result.description_ja || "",
      description_vi: result.description_vi || "",
      tags: result.tags || [],
    };
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({
      primaryLanguage: ownerLanguage,
      primaryName: "",
      name_en: "",
      name_ja: "",
      name_vi: "",
    });
  };

  const openCreateCategoryDialog = () => {
    resetCategoryForm();
    setIsCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: WorkspaceCategory) => {
    if (category.source === "organization") {
      return;
    }

    setEditingCategory(category);
    setCategoryForm({
      primaryLanguage: ownerLanguage,
      primaryName:
        (ownerLanguage === "vi"
          ? category.name_vi
          : ownerLanguage === "ja"
            ? category.name_ja
            : category.name_en) ?? category.name_en,
      name_en: category.name_en,
      name_ja: category.name_ja ?? "",
      name_vi: category.name_vi ?? "",
    });
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    const primaryName = categoryForm.primaryName.trim();
    if (!primaryName && !categoryForm.name_en.trim()) {
      toast.error(copy.categoryRequired);
      return;
    }

    setIsSubmittingCategory(true);
    try {
      let translated = {
        name_en: categoryForm.name_en.trim(),
        name_ja: categoryForm.name_ja.trim(),
        name_vi: categoryForm.name_vi.trim(),
      };

      if (!translated.name_en || !translated.name_ja || !translated.name_vi) {
        const result = await handleTranslate(
          primaryName || translated.name_en,
          "category",
        );
        translated = {
          name_en: translated.name_en || result.en,
          name_ja: translated.name_ja || result.ja,
          name_vi: translated.name_vi || result.vi,
        };
      }

      if (categoryForm.primaryLanguage === "en")
        translated.name_en = primaryName || translated.name_en;
      if (categoryForm.primaryLanguage === "ja")
        translated.name_ja = primaryName || translated.name_ja;
      if (categoryForm.primaryLanguage === "vi")
        translated.name_vi = primaryName || translated.name_vi;

      const response = await fetch(
        editingCategory
          ? `/api/v1/owner/categories/${editingCategory.id}?branchId=${encodeURIComponent(branchId)}`
          : `/api/v1/owner/categories?branchId=${encodeURIComponent(branchId)}`,
        {
          method: editingCategory ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...translated,
            position:
              editingCategory?.position ?? workspace?.categories.length ?? 0,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error?.message ?? data.message ?? "Failed to save category",
        );
      }

      toast.success(
        editingCategory ? copy.categoryUpdated : copy.categorySaved,
      );
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      await loadWorkspace("refresh");
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save category",
      );
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: WorkspaceCategory) => {
    if (category.source === "organization" || category.menu_items.length > 0) {
      return;
    }

    if (!window.confirm(copy.deleteCategoryConfirm)) {
      return;
    }

    const response = await fetch(
      `/api/v1/owner/categories/${category.id}?branchId=${encodeURIComponent(branchId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(
        data.error?.message ?? data.message ?? "Failed to delete category",
      );
      return;
    }

    await loadWorkspace("refresh");
  };

  const handleDeleteItem = async (item: WorkspaceItem) => {
    if (item.source === "organization") return;

    if (!window.confirm(copy.deleteItemConfirm)) {
      return;
    }

    const response = await fetch(
      `/api/v1/owner/menu/menu-items/${item.id}?branchId=${encodeURIComponent(branchId)}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.message ?? data.error ?? "Failed to delete item");
      return;
    }

    await loadWorkspace("refresh");
  };

  const handleToggleAvailability = async (item: WorkspaceItem) => {
    if (item.source === "organization") return;

    const response = await fetch(
      `/api/v1/owner/menu/menu-items/${item.id}?branchId=${encodeURIComponent(branchId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available }),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(
        data.message ?? data.error ?? "Failed to update item availability",
      );
      return;
    }

    await loadWorkspace("refresh");
  };

  const handleEditItem = (item: WorkspaceItem) => {
    if (item.source === "organization") return;
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (data: StreamlinedMenuItemFormData) => {
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      let imageUrl = data.image_url ?? "";

      if (data.imageFile) {
        const optimizedImage = await optimizeMenuImageFile(data.imageFile);
        const sessionResponse = await fetch("/api/v1/auth/session");
        const sessionData = await sessionResponse.json();
        if (!sessionData.authenticated || !sessionData.user?.restaurantId) {
          throw new Error("User not authenticated or missing restaurant ID");
        }

        const fileName = `${Date.now()}-${optimizedImage.file.name}`;
        const filePath = `restaurants/${sessionData.user.restaurantId}/menu_items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("restaurant-uploads")
          .upload(filePath, optimizedImage.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from("restaurant-uploads")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const payload = {
        ...data,
        image_url: imageUrl && imageUrl.trim().length > 0 ? imageUrl : null,
      };

      const response = await fetch(
        `/api/v1/owner/menu/menu-items/${editingItem.id}?branchId=${encodeURIComponent(branchId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message ?? "Failed to save menu item");
      }

      toast.success("Menu item updated.");
      setEditingItem(null);
      setIsEditModalOpen(false);
      await loadWorkspace("refresh");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : "Failed to save item",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) {
    return <MenuSkeleton />;
  }

  if (error || !workspace) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Menu workspace unavailable</AlertTitle>
        <AlertDescription>
          {error ?? "Failed to load the branch menu workspace."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.04),_transparent_46%),linear-gradient(160deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-5 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.12),_transparent_44%),linear-gradient(160deg,rgba(2,6,23,0.96),rgba(15,23,42,0.92))]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-100">
                <Store className="mr-1.5 h-3.5 w-3.5" />
                {workspace.branch.name}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {copy.title}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              onClick={() => loadWorkspace("refresh")}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
              />
              {copy.refresh}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              onClick={openCreateCategoryDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              {copy.newCategory}
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              onClick={() => router.push(`/${locale}/branch/${branchId}/menu/new`)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {copy.newItem}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: copy.totalItems, value: workspace.summary.totalItems },
          { label: copy.inherited, value: workspace.summary.inheritedItems },
          { label: copy.local, value: workspace.summary.localItems },
          { label: copy.missingImages, value: missingImageCount },
        ].map((stat) => (
          <article
            key={stat.label}
            className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {copy.categories}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">
                {workspace.categories.length}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              onClick={openCreateCategoryDialog}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors",
                selectedCategoryId === "all"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900",
              )}
            >
              <span className="font-medium">{copy.allCategories}</span>
              <span className="text-sm tabular-nums">
                {workspace.summary.totalItems}
              </span>
            </button>

            {workspace.categories.map((category) => (
              <div
                key={category.id}
                className={cn(
                  "rounded-2xl border px-3 py-3 transition-colors",
                  selectedCategoryId === category.id
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {localizeEntry(category, locale)}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          selectedCategoryId === category.id
                            ? "text-slate-200 dark:text-slate-700"
                            : "text-slate-500 dark:text-slate-400",
                        )}
                      >
                        {category.menu_items.length} {copy.itemCount}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full",
                        sourceBadgeClass(category.source),
                      )}
                    >
                      {category.source === "organization"
                        ? copy.companyManaged
                        : copy.branchManaged}
                    </Badge>
                  </div>
                </button>
                {category.source === "branch" ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      onClick={() => openEditCategoryDialog(category)}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      {copy.edit}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                      disabled={category.menu_items.length > 0}
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      {copy.remove}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-11 rounded-2xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 lg:max-w-md"
              />

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", copy.all],
                    ["organization", copy.companyOnly],
                    ["branch", copy.branchOnly],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={sourceFilter === value ? "default" : "outline"}
                    className={cn(
                      "rounded-xl border-slate-200 dark:border-slate-700",
                      sourceFilter === value
                        ? "bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-100"
                        : "bg-white dark:bg-slate-900/80 dark:text-slate-100",
                    )}
                    onClick={() => setSourceFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={showMissingImagesOnly ? "default" : "outline"}
                  className={cn(
                    "rounded-xl border-slate-200 dark:border-slate-700",
                    showMissingImagesOnly
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300"
                      : "bg-white dark:bg-slate-900/80 dark:text-slate-100",
                  )}
                  onClick={() =>
                    setShowMissingImagesOnly((current) => !current)
                  }
                >
                  <ImageOff className="mr-2 h-4 w-4" />
                  {copy.missingOnly}
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {visibleCategories.length > 0 ? (
              visibleCategories.map((category) => (
                <article
                  key={category.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/90"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-slate-950 dark:text-slate-50">
                          {localizeEntry(category, locale)}
                        </h3>
                        <Badge
                          className={cn(
                            "rounded-full",
                            sourceBadgeClass(category.source),
                          )}
                        >
                          {category.source === "organization"
                            ? copy.companyManaged
                            : copy.branchManaged}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {category.menu_items.length} {copy.itemCount}
                        </Badge>
                        {category.menu_items.some((item) => !item.image_url) ? (
                          <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/15">
                            <ImageOff className="mr-1.5 h-3.5 w-3.5" />
                            {
                              category.menu_items.filter(
                                (item) => !item.image_url,
                              ).length
                            }
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 sm:p-5">
                    {category.menu_items.length > 0 ? (
                      category.menu_items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70"
                        >
                          {(() => {
                            const localizedDescription = localizeDescription(
                              item,
                              locale,
                            );

                            return (
                              <div className="grid gap-4 md:grid-cols-[88px_minmax(0,1fr)] xl:grid-cols-[88px_minmax(0,1fr)_auto]">
                                <div
                                  className={cn(
                                    "flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100 bg-cover bg-center dark:border-slate-800 dark:bg-slate-900",
                                    !item.image_url &&
                                      "text-slate-400 dark:text-slate-500",
                                  )}
                                  style={
                                    item.image_url
                                      ? {
                                          backgroundImage: `url(${item.image_url})`,
                                        }
                                      : undefined
                                  }
                                >
                                  {!item.image_url ? (
                                    <ImageOff className="h-5 w-5" />
                                  ) : null}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                                      {localizeEntry(item, locale)}
                                    </p>
                                    <Badge
                                      className={cn(
                                        "rounded-full",
                                        sourceBadgeClass(item.source),
                                      )}
                                    >
                                      {item.source === "organization"
                                        ? copy.companyManaged
                                        : copy.branchManaged}
                                    </Badge>
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "rounded-full",
                                        item.available
                                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
                                          : "bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-800",
                                      )}
                                    >
                                      {item.available
                                        ? copy.available
                                        : copy.unavailable}
                                    </Badge>
                                    {!item.image_url ? (
                                      <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/15">
                                        {copy.missingImage}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  {localizedDescription ? (
                                    <p className="mt-2 hidden text-sm leading-6 text-slate-600 dark:text-slate-300 md:block">
                                      {localizedDescription}
                                    </p>
                                  ) : null}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {item.sizes.map((size) => (
                                      <Badge
                                        key={
                                          size.id ??
                                          `${item.id}-${size.size_key}`
                                        }
                                        variant="secondary"
                                        className="rounded-full border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                      >
                                        {localizeEntry(size, locale)}{" "}
                                        {formatCurrency(
                                          size.price,
                                          "JPY",
                                          localeCode(locale),
                                        )}
                                      </Badge>
                                    ))}
                                    {item.toppings.map((topping) => (
                                      <Badge
                                        key={
                                          topping.id ??
                                          `${item.id}-${topping.name_en}`
                                        }
                                        variant="secondary"
                                        className="rounded-full border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                      >
                                        {localizeEntry(topping, locale)} +
                                        {formatCurrency(
                                          topping.price,
                                          "JPY",
                                          localeCode(locale),
                                        )}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-start gap-3 xl:items-end">
                                  <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                                    {formatCurrency(
                                      item.price,
                                      "JPY",
                                      localeCode(locale),
                                    )}
                                  </p>

                                  {item.source === "branch" ? (
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                        onClick={() => handleEditItem(item)}
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {copy.edit}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                        onClick={() =>
                                          handleToggleAvailability(item)
                                        }
                                      >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        {item.available ? copy.hide : copy.show}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                                        onClick={() => handleDeleteItem(item)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {copy.remove}
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        {copy.empty}
                      </div>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[30px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
                <Layers3 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">
                  {copy.empty}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    onClick={openCreateCategoryDialog}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {copy.newCategory}
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                    onClick={() => router.push(`/${locale}/branch/${branchId}/menu/new`)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {copy.newItem}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open);
          if (!open) {
            resetCategoryForm();
          }
        }}
      >
        <DialogContent className="rounded-[30px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? copy.editCategoryTitle
                : copy.createCategoryTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {copy.primaryLanguage}
                </p>
                <Select
                  value={categoryForm.primaryLanguage}
                  onValueChange={(value) =>
                    setCategoryForm((current) => ({
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
                  {copy.categoryName}
                </p>
                <Input
                  value={categoryForm.primaryName}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      primaryName: event.target.value,
                    }))
                  }
                  className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder={copy.categoryPlaceholder}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                value={categoryForm.name_en}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name_en: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="English"
              />
              <Input
                value={categoryForm.name_ja}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name_ja: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="日本語"
              />
              <Input
                value={categoryForm.name_vi}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name_vi: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Tiếng Việt"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              onClick={handleSaveCategory}
              disabled={isSubmittingCategory}
            >
              {isSubmittingCategory
                ? `${copy.save}...`
                : editingCategory
                  ? copy.save
                  : copy.newCategory}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MenuItemCreationWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        branchId={branchId}
        categories={workspace.categories.map((category) => ({
          id: category.id,
          name_en: category.name_en,
          name_ja: category.name_ja,
          name_vi: category.name_vi,
          source: category.source,
          itemCount: category.menu_items.length,
        }))}
        ownerLanguage={ownerLanguage}
        locale={locale}
        organizationName={workspace.organization?.name ?? null}
        branchName={workspace.branch.name}
        onCreated={() => loadWorkspace("refresh")}
      />

      <ItemModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        initialData={
          editingItem
            ? ({
                id: editingItem.id,
                name_en: editingItem.name_en,
                name_ja: editingItem.name_ja ?? undefined,
                name_vi: editingItem.name_vi ?? undefined,
                description_en: editingItem.description_en ?? undefined,
                description_ja: editingItem.description_ja ?? undefined,
                description_vi: editingItem.description_vi ?? undefined,
                price: editingItem.price,
                image_url: editingItem.image_url ?? undefined,
                available: editingItem.available,
                weekday_visibility: editingItem.weekday_visibility,
                position: editingItem.position,
                category_id: editingItem.category_id,
                stock_level: editingItem.stock_level ?? undefined,
                toppings: editingItem.toppings.map((topping) => ({
                  id: topping.id,
                  name_en: topping.name_en,
                  name_ja: topping.name_ja ?? undefined,
                  name_vi: topping.name_vi ?? undefined,
                  price: topping.price,
                  position: topping.position ?? 0,
                })),
                menu_item_sizes: editingItem.sizes.map((size) => ({
                  id: size.id,
                  size_key: size.size_key,
                  name_en: size.name_en,
                  name_ja: size.name_ja ?? undefined,
                  name_vi: size.name_vi ?? undefined,
                  price: size.price,
                  position: size.position,
                })),
              } satisfies MenuItem & {
                stock_level?: number;
                toppings?: Array<{
                  id?: string;
                  name_en: string;
                  name_ja?: string;
                  name_vi?: string;
                  price: number;
                  position: number;
                }>;
                menu_item_sizes?: Array<{
                  id?: string;
                  size_key: string;
                  name_en: string;
                  name_ja?: string;
                  name_vi?: string;
                  price: number;
                  position: number;
                }>;
              })
            : undefined
        }
        categories={categoryOptions}
        onSave={handleSaveEdit}
        texts={{
          saveButton: isSavingEdit ? "Saving..." : "Save",
          cancelButton: "Cancel",
          title: "Edit branch item",
          successMessage: "Menu item updated.",
          errorMessage: "Failed to update item.",
        }}
        ownerLanguage={ownerLanguage}
        onTranslate={(text, _field, context) => handleTranslate(text, context)}
        onGenerateDescription={handleGenerateDescription}
        onGenerateAI={handleGenerateAI}
      />
    </div>
  );
}

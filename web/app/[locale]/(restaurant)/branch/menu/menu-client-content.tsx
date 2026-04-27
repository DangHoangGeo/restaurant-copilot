"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
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
type StatusFilter = "all" | "available" | "hidden";

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

interface MenuRow {
  item: WorkspaceItem;
  category: WorkspaceCategory;
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
      categoryFilter: "カテゴリ",
      sourceFilter: "管理元",
      statusFilter: "状態",
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
      soldOut: "売り切れ",
      inactive: "停止中",
      missingImage: "画像未設定",
      remove: "削除",
      edit: "編集",
      hide: "非表示",
      show: "表示",
      save: "保存",
      cancel: "キャンセル",
      saving: "保存中",
      workspaceUnavailable: "メニューを読み込めません",
      loadFailed: "支店メニューの読み込みに失敗しました。",
      translationFailed: "翻訳に失敗しました。",
      descriptionGenerationFailed: "説明文の生成に失敗しました。",
      aiGenerationFailed: "AI生成に失敗しました。",
      editBranchItem: "支店メニューを編集",
      itemUpdated: "メニューを更新しました。",
      itemUpdateFailed: "メニューの更新に失敗しました。",
      itemCount: "件",
      itemsTable: "メニュー一覧",
      branchItemsTable: "支店で管理するメニュー",
      sharedItemsTable: "会社共有メニュー",
      branchItemsEmpty: "この条件に合う支店メニューはありません。",
      sharedItemsEmpty: "この条件に合う共有メニューはありません。",
      branchCategoriesTitle: "支店カテゴリ",
      sharedCategoriesTitle: "会社カテゴリ",
      branchCategoriesEmpty: "支店カテゴリはまだありません。",
      sharedCategoriesEmpty: "会社カテゴリはまだありません。",
      itemColumn: "メニュー",
      categoryColumn: "カテゴリ",
      sourceColumn: "管理元",
      statusColumn: "状態",
      priceColumn: "価格",
      optionColumn: "サイズ・トッピング",
      actionColumn: "操作",
      imageReady: "画像あり",
    };
  }

  if (locale === "vi") {
    return {
      title: "Thực đơn chi nhánh",
      categories: "Danh mục",
      allCategories: "Tất cả danh mục",
      categoryFilter: "Danh mục",
      sourceFilter: "Nguồn quản lý",
      statusFilter: "Trạng thái",
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
      soldOut: "Hết món",
      inactive: "Tạm dừng",
      missingImage: "Thiếu ảnh",
      remove: "Xóa",
      edit: "Sửa",
      hide: "Ẩn",
      show: "Hiện",
      save: "Lưu",
      cancel: "Hủy",
      saving: "Đang lưu",
      workspaceUnavailable: "Không tải được thực đơn",
      loadFailed: "Không thể tải thực đơn của chi nhánh.",
      translationFailed: "Dịch thất bại.",
      descriptionGenerationFailed: "Tạo mô tả thất bại.",
      aiGenerationFailed: "Tạo nội dung AI thất bại.",
      editBranchItem: "Sửa món của chi nhánh",
      itemUpdated: "Đã cập nhật món.",
      itemUpdateFailed: "Không thể cập nhật món.",
      itemCount: "món",
      itemsTable: "Danh sách món",
      branchItemsTable: "Món riêng của chi nhánh",
      sharedItemsTable: "Món dùng chung từ công ty",
      branchItemsEmpty: "Không có món riêng nào khớp bộ lọc.",
      sharedItemsEmpty: "Không có món dùng chung nào khớp bộ lọc.",
      branchCategoriesTitle: "Danh mục của chi nhánh",
      sharedCategoriesTitle: "Danh mục từ công ty",
      branchCategoriesEmpty: "Chi nhánh chưa có danh mục riêng.",
      sharedCategoriesEmpty: "Chưa có danh mục công ty.",
      itemColumn: "Món",
      categoryColumn: "Danh mục",
      sourceColumn: "Nguồn",
      statusColumn: "Trạng thái",
      priceColumn: "Giá",
      optionColumn: "Kích cỡ / topping",
      actionColumn: "Thao tác",
      imageReady: "Có ảnh",
    };
  }

  return {
    title: "Branch menu",
    categories: "Categories",
    allCategories: "All categories",
    categoryFilter: "Category",
    sourceFilter: "Source",
    statusFilter: "Status",
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
    soldOut: "Sold out",
    inactive: "Inactive",
    missingImage: "No image",
    remove: "Remove",
    edit: "Edit",
    hide: "Hide",
    show: "Show",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving",
    workspaceUnavailable: "Menu workspace unavailable",
    loadFailed: "Failed to load the branch menu workspace.",
    translationFailed: "Translation failed.",
    descriptionGenerationFailed: "Description generation failed.",
    aiGenerationFailed: "AI generation failed.",
    editBranchItem: "Edit branch item",
    itemUpdated: "Menu item updated.",
    itemUpdateFailed: "Failed to update item.",
    itemCount: "items",
    itemsTable: "Menu items",
    branchItemsTable: "Branch-owned items",
    sharedItemsTable: "Shared company items",
    branchItemsEmpty: "No branch-owned items match the filters.",
    sharedItemsEmpty: "No shared items match the filters.",
    branchCategoriesTitle: "Branch categories",
    sharedCategoriesTitle: "Company categories",
    branchCategoriesEmpty: "This branch has no local categories yet.",
    sharedCategoriesEmpty: "No company categories are available yet.",
    itemColumn: "Item",
    categoryColumn: "Category",
    sourceColumn: "Source",
    statusColumn: "Status",
    priceColumn: "Price",
    optionColumn: "Sizes / toppings",
    actionColumn: "Action",
    imageReady: "Image ready",
  };
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

function localeCode(locale: string) {
  if (locale === "vi") return "vi-VN";
  if (locale === "ja") return "ja-JP";
  return "en-US";
}

function getItemStatus(item: WorkspaceItem) {
  if (item.available) return "active";
  if (item.stock_level === 0) return "soldOut";
  return "inactive";
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showMissingImagesOnly, setShowMissingImagesOnly] = useState(false);
  const [showSharedCategories, setShowSharedCategories] = useState(false);
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
          throw new Error(data.error ?? copy.loadFailed);
        }

        const data = (await response.json()) as WorkspaceResponse;
        setWorkspace(data);
        setError(null);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error ? fetchError.message : copy.loadFailed,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [branchId, copy.loadFailed],
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

  const menuRows = useMemo(
    () =>
      visibleCategories
        .flatMap((category) =>
          category.menu_items.map((item) => ({
            item,
            category,
          })),
        )
        .filter(({ item }) => {
          if (statusFilter === "available") {
            return item.available;
          }

          if (statusFilter === "hidden") {
            return !item.available;
          }

          return true;
        })
        .sort((left, right) => {
          const categoryPosition =
            left.category.position - right.category.position;
          if (categoryPosition !== 0) {
            return categoryPosition;
          }

          return left.item.position - right.item.position;
        }),
    [statusFilter, visibleCategories],
  );

  const branchMenuRows = useMemo(
    () => menuRows.filter(({ item }) => item.source === "branch"),
    [menuRows],
  );

  const sharedMenuRows = useMemo(
    () => menuRows.filter(({ item }) => item.source === "organization"),
    [menuRows],
  );

  const branchCategories = useMemo(
    () =>
      (workspace?.categories ?? []).filter(
        (category) => category.source === "branch",
      ),
    [workspace?.categories],
  );

  const sharedCategories = useMemo(
    () =>
      (workspace?.categories ?? []).filter(
        (category) => category.source === "organization",
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
      throw new Error(copy.translationFailed);
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
      throw new Error(copy.descriptionGenerationFailed);
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
      throw new Error(copy.aiGenerationFailed);
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
          data.error?.message ?? data.message ?? copy.categoryRequired,
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
          : copy.categoryRequired,
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
        data.error?.message ?? data.message ?? copy.deleteCategoryConfirm,
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
      toast.error(data.message ?? data.error ?? copy.deleteItemConfirm);
      return;
    }

    await loadWorkspace("refresh");
  };

  const handleToggleAvailability = async (item: WorkspaceItem) => {
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
      toast.error(data.message ?? data.error ?? copy.itemUpdateFailed);
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
          throw new Error(copy.itemUpdateFailed);
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
        throw new Error(result.message ?? copy.itemUpdateFailed);
      }

      toast.success(copy.itemUpdated);
      setEditingItem(null);
      setIsEditModalOpen(false);
      await loadWorkspace("refresh");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : copy.itemUpdateFailed,
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const renderStatusDot = (item: WorkspaceItem) => {
    const status = getItemStatus(item);

    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-[#FFF7E9] dark:ring-[#170F0C]",
          status === "active" && "bg-[#3F7A4D]",
          status === "soldOut" && "bg-[#D4872D]",
          status === "inactive" && "bg-[#B42318]",
        )}
      />
    );
  };

  const renderCategorySection = ({
    title,
    categories,
    emptyMessage,
    description,
    isOpen = true,
    onToggle,
  }: {
    title: string;
    categories: WorkspaceCategory[];
    emptyMessage: string;
    description?: string;
    isOpen?: boolean;
    onToggle?: () => void;
  }) => (
    <div className="overflow-hidden rounded-xl border border-[#AB6E3C]/12 dark:border-[#F1DCC4]/10">
      <div className="flex items-start justify-between gap-3 border-b border-[#AB6E3C]/10 bg-[#F5EAD8]/64 px-3 py-2.5 dark:border-[#F1DCC4]/10 dark:bg-[#2B1A10]/70">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[#8B6E5A] dark:text-[#C9B7A0]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className="rounded-md border border-[#AB6E3C]/14 bg-[#FFF7E9] text-[#6F4D35] hover:bg-[#FFF7E9] dark:border-[#F1DCC4]/12 dark:bg-[#170F0C] dark:text-[#F1DCC4]">
            {categories.length}
          </Badge>
          {onToggle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-[#AB6E3C]/20 bg-[#FEFAF6] px-2 text-xs text-[#6F4D35] hover:bg-[#FFF7E9] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
              onClick={onToggle}
            >
              {isOpen ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {isOpen ? copy.hide : copy.show}
            </Button>
          ) : null}
        </div>
      </div>
      {isOpen ? (
        <div className="max-h-[220px] overflow-y-auto xl:max-h-[340px]">
        <table className="w-full table-fixed text-left text-sm">
          <tbody className="divide-y divide-[#AB6E3C]/10 dark:divide-[#F1DCC4]/10">
            {categories.length > 0 ? (
              categories.map((category) => (
                <tr
                  key={category.id}
                  className={cn(
                    "transition-colors",
                    selectedCategoryId === category.id
                      ? "bg-[#2E2117] text-[#FFF7E9] dark:bg-[#F1DCC4] dark:text-[#170F0C]"
                      : "bg-[#FEFAF6]/62 hover:bg-[#F5EAD8]/75 dark:bg-[#2B1A10]/45 dark:hover:bg-[#332116]",
                  )}
                >
                  {category.source === "branch" ? (
                    <>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="min-w-0 text-left font-medium leading-5"
                          onClick={() => setSelectedCategoryId(category.id)}
                        >
                          {localizeEntry(category, locale)}
                        </button>
                      </td>
                      <td className="w-[148px] px-3 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            title={copy.edit}
                            className={cn(
                              "h-8 rounded-lg px-2 text-xs",
                              selectedCategoryId === category.id
                                ? "text-[#FFF7E9] hover:bg-[#6F4D35] dark:text-[#170F0C] dark:hover:bg-[#EBD9C4]"
                                : "text-[#6F4D35] hover:bg-[#F5EAD8] dark:text-[#F1DCC4] dark:hover:bg-[#332116]",
                            )}
                            onClick={() => openEditCategoryDialog(category)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {copy.edit}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            title={copy.remove}
                            className="h-8 rounded-lg px-2 text-xs text-[#B42318] hover:bg-[#FDECEC] disabled:text-[#B89078] dark:text-[#FFB4A8] dark:hover:bg-[#7A1F16]/18"
                            disabled={category.menu_items.length > 0}
                            onClick={() => handleDeleteCategory(category)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {copy.remove}
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-3" colSpan={2}>
                      <button
                        type="button"
                        className="min-w-0 text-left font-medium leading-5"
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        {localizeEntry(category, locale)}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="px-3 py-8 text-center text-sm text-[#8B6E5A] dark:text-[#C9B7A0]"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      ) : null}
    </div>
  );

  const renderMenuItemsSection = ({
    title,
    rows,
    emptyMessage,
    description,
  }: {
    title: string;
    rows: MenuRow[];
    emptyMessage: string;
    description?: string;
  }) => (
    <section className="overflow-hidden rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72">
      <div className="flex items-start justify-between gap-3 border-b border-[#AB6E3C]/12 px-4 py-3 dark:border-[#F1DCC4]/12">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-[60ch] text-xs leading-5 text-[#8B6E5A] dark:text-[#C9B7A0]">
              {description}
            </p>
          ) : null}
        </div>
        <Badge className="shrink-0 rounded-md border border-[#AB6E3C]/14 bg-[#F5EAD8] text-[#6F4D35] hover:bg-[#F5EAD8] dark:border-[#F1DCC4]/12 dark:bg-[#2B1A10] dark:text-[#F1DCC4]">
          {rows.length}
        </Badge>
      </div>

      <div className="divide-y divide-[#AB6E3C]/10 sm:hidden dark:divide-[#F1DCC4]/10">
        {rows.length > 0 ? (
          rows.map(({ item, category }) => (
            <article key={item.id} className="space-y-3 px-3 py-4">
              <div className="flex gap-3">
                <div
                  className={cn(
                    "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#AB6E3C]/14 bg-[#F5EAD8] bg-cover bg-center dark:border-[#F1DCC4]/12 dark:bg-[#170F0C]",
                    !item.image_url && "text-[#B89078] dark:text-[#C9B7A0]",
                  )}
                  style={
                    item.image_url
                      ? { backgroundImage: `url(${item.image_url})` }
                      : undefined
                  }
                >
                  {!item.image_url ? <ImageOff className="h-4 w-4" /> : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        {renderStatusDot(item)}
                        <p className="truncate font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
                          {localizeEntry(item, locale)}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-xs text-[#8B6E5A] dark:text-[#C9B7A0]">
                        {localizeEntry(category, locale)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-[#2E2117] dark:text-[#F7F1E9]">
                      {formatCurrency(item.price, "JPY", localeCode(locale))}
                    </p>
                  </div>

                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {item.source === "branch" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg border-[#AB6E3C]/20 bg-[#FEFAF6] px-3 text-xs text-[#6F4D35] hover:bg-[#F5EAD8] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
                    onClick={() => handleEditItem(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {copy.edit}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg border-[#AB6E3C]/20 bg-[#FEFAF6] px-3 text-xs text-[#6F4D35] hover:bg-[#F5EAD8] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
                  onClick={() => handleToggleAvailability(item)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {item.available ? copy.hide : copy.show}
                </Button>
              </div>
            </article>
          ))
        ) : (
          <div className="px-3 py-14 text-center text-sm text-[#8B6E5A] dark:text-[#C9B7A0]">
            <Layers3 className="mx-auto mb-3 h-8 w-8 text-[#B89078] dark:text-[#C9B7A0]" />
            {emptyMessage}
          </div>
        )}
      </div>

      <div className="hidden max-h-[640px] overflow-y-auto sm:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[#AB6E3C]/12 bg-[#F5EAD8] text-xs text-[#8B6E5A] dark:border-[#F1DCC4]/12 dark:bg-[#2B1A10] dark:text-[#C9B7A0]">
            <tr>
              <th className="w-[38%] px-3 py-2 font-medium sm:w-auto">
                {copy.itemColumn}
              </th>
              <th className="hidden w-[18%] px-3 py-2 font-medium md:table-cell">
                {copy.categoryColumn}
              </th>
              <th className="w-[92px] px-2 py-2 font-medium sm:px-3">
                {copy.priceColumn}
              </th>
              <th className="hidden w-[20%] px-3 py-2 font-medium xl:table-cell">
                {copy.optionColumn}
              </th>
              <th className="w-[156px] px-2 py-2 text-right font-medium sm:w-[220px] sm:px-3">
                {copy.actionColumn}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#AB6E3C]/10 dark:divide-[#F1DCC4]/10">
            {rows.length > 0 ? (
              rows.map(({ item, category }) => (
                <tr
                  key={item.id}
                  className="align-top transition-colors hover:bg-[#F5EAD8]/60 dark:hover:bg-[#332116]/70"
                >
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#AB6E3C]/14 bg-[#F5EAD8] bg-cover bg-center dark:border-[#F1DCC4]/12 dark:bg-[#170F0C] sm:h-12 sm:w-12",
                          !item.image_url &&
                            "text-[#B89078] dark:text-[#C9B7A0]",
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
                          <ImageOff className="h-4 w-4" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          {renderStatusDot(item)}
                          <p className="truncate font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
                            {localizeEntry(item, locale)}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs text-[#8B6E5A] dark:text-[#C9B7A0] md:hidden">
                          {localizeEntry(category, locale)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-[#6F4D35] dark:text-[#F1DCC4] md:table-cell">
                    {localizeEntry(category, locale)}
                  </td>
                  <td className="px-2 py-3 text-right text-xs font-semibold tabular-nums text-[#2E2117] dark:text-[#F7F1E9] sm:px-3 sm:text-sm">
                    {formatCurrency(item.price, "JPY", localeCode(locale))}
                  </td>
                  <td className="hidden max-w-[320px] px-3 py-3 xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {[...item.sizes, ...item.toppings]
                        .slice(0, 4)
                        .map((option) => (
                          <Badge
                            key={option.id ?? `${item.id}-${option.name_en}`}
                            variant="secondary"
                            className="rounded-md border border-[#AB6E3C]/14 bg-[#FFF7E9] text-[#6F4D35] dark:border-[#F1DCC4]/12 dark:bg-[#170F0C] dark:text-[#F1DCC4]"
                          >
                            {localizeEntry(option, locale)}
                          </Badge>
                        ))}
                      {item.sizes.length + item.toppings.length > 4 ? (
                        <Badge className="rounded-md border border-[#AB6E3C]/14 bg-[#F5EAD8] text-[#6F4D35] dark:border-[#F1DCC4]/12 dark:bg-[#2B1A10] dark:text-[#F1DCC4]">
                          +{item.sizes.length + item.toppings.length - 4}
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right sm:px-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {item.source === "branch" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          title={copy.edit}
                          className="h-8 rounded-lg px-2 text-xs text-[#6F4D35] hover:bg-[#F5EAD8] dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
                          onClick={() => handleEditItem(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {copy.edit}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        title={item.available ? copy.hide : copy.show}
                        className="h-8 rounded-lg px-2 text-xs text-[#6F4D35] hover:bg-[#F5EAD8] dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
                        onClick={() => handleToggleAvailability(item)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {item.available ? copy.hide : copy.show}
                      </Button>
                      {item.source === "branch" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          title={copy.remove}
                          className="h-8 rounded-lg px-2 text-xs text-[#B42318] hover:bg-[#FDECEC] dark:text-[#FFB4A8] dark:hover:bg-[#7A1F16]/18"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {copy.remove}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-14 text-center text-sm text-[#8B6E5A] dark:text-[#C9B7A0]"
                >
                  <Layers3 className="mx-auto mb-3 h-8 w-8 text-[#B89078] dark:text-[#C9B7A0]" />
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  if (isLoading) {
    return <MenuSkeleton />;
  }

  if (error || !workspace) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{copy.workspaceUnavailable}</AlertTitle>
        <AlertDescription>{error ?? copy.loadFailed}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 text-[#2E2117] dark:text-[#F7F1E9]">
      <section className="overflow-hidden rounded-2xl border border-[#AB6E3C]/15 bg-[#FEFAF6]/80 p-4 shadow-[0_18px_48px_-32px_rgba(91,58,32,0.45)] backdrop-blur dark:border-[#AB6E3C]/20 dark:bg-[#251810]/78 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-md border border-[#AB6E3C]/25 bg-[#2E2117] text-[#FFF7E9] hover:bg-[#2E2117] dark:border-[#F1DCC4]/20 dark:bg-[#F1DCC4] dark:text-[#170F0C] dark:hover:bg-[#F1DCC4]">
                <Store className="mr-1.5 h-3.5 w-3.5" />
                {workspace.branch.name}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-[#2E2117] sm:text-3xl dark:text-[#F7F1E9]">
              {copy.title}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-[#AB6E3C]/20 bg-[#FFF7E9]/80 text-[#6F4D35] shadow-sm hover:bg-[#F5EAD8] hover:text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
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
              className="rounded-xl border-[#AB6E3C]/20 bg-[#FFF7E9]/80 text-[#6F4D35] shadow-sm hover:bg-[#F5EAD8] hover:text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]"
              onClick={openCreateCategoryDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              {copy.newCategory}
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/20 hover:bg-[#965B2E] dark:bg-[#C8773E] dark:hover:bg-[#D4894E]"
              onClick={() =>
                router.push(`/${locale}/branch/${branchId}/menu/new`)
              }
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {copy.newItem}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-3 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
              {copy.categories}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl border-[#AB6E3C]/20 bg-[#FEFAF6] text-[#6F4D35] hover:bg-[#F5EAD8] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10] dark:text-[#F1DCC4]"
              onClick={openCreateCategoryDialog}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {renderCategorySection({
            title: copy.branchCategoriesTitle,
            categories: branchCategories,
            emptyMessage: copy.branchCategoriesEmpty,
          })}
          {renderCategorySection({
            title: copy.sharedCategoriesTitle,
            categories: sharedCategories,
            emptyMessage: copy.sharedCategoriesEmpty,
            isOpen: showSharedCategories,
            onToggle: () => setShowSharedCategories((current) => !current),
          })}
        </aside>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[#AB6E3C]/15 bg-[#FFF7E9]/72 p-3 shadow-sm backdrop-blur dark:border-[#F1DCC4]/12 dark:bg-[#251810]/72 sm:p-4">
            <div className="space-y-2.5">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-10 rounded-xl border-[#AB6E3C]/18 bg-[#FEFAF6] text-[#2E2117] placeholder:text-[#B89078] focus-visible:ring-[#AB6E3C]/25 dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9] dark:placeholder:text-[#C9B7A0] sm:h-11"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(180px,1fr)_150px_140px_auto]">
                <Select
                  value={selectedCategoryId}
                  onValueChange={setSelectedCategoryId}
                >
                  <SelectTrigger className="h-9 min-w-0 rounded-xl border-[#AB6E3C]/18 bg-[#FEFAF6] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9] sm:h-10">
                    <SelectValue placeholder={copy.categoryFilter} />
                  </SelectTrigger>
                  <SelectContent className="border-[#AB6E3C]/20 bg-[#FFF7E9] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]">
                    <SelectItem value="all">{copy.allCategories}</SelectItem>
                    {workspace.categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {localizeEntry(category, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sourceFilter}
                  onValueChange={(value) =>
                    setSourceFilter(value as SourceFilter)
                  }
                >
                  <SelectTrigger className="h-9 min-w-0 rounded-xl border-[#AB6E3C]/18 bg-[#FEFAF6] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9] sm:h-10">
                    <SelectValue placeholder={copy.sourceFilter} />
                  </SelectTrigger>
                  <SelectContent className="border-[#AB6E3C]/20 bg-[#FFF7E9] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]">
                    <SelectItem value="all">{copy.all}</SelectItem>
                    <SelectItem value="organization">
                      {copy.companyOnly}
                    </SelectItem>
                    <SelectItem value="branch">{copy.branchOnly}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as StatusFilter)
                  }
                >
                  <SelectTrigger className="h-9 min-w-0 rounded-xl border-[#AB6E3C]/18 bg-[#FEFAF6] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#2B1A10]/80 dark:text-[#F7F1E9] sm:h-10">
                    <SelectValue placeholder={copy.statusFilter} />
                  </SelectTrigger>
                  <SelectContent className="border-[#AB6E3C]/20 bg-[#FFF7E9] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]">
                    <SelectItem value="all">{copy.all}</SelectItem>
                    <SelectItem value="available">{copy.available}</SelectItem>
                    <SelectItem value="hidden">{copy.unavailable}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant={showMissingImagesOnly ? "default" : "outline"}
                  title={copy.missingOnly}
                  className={cn(
                    "h-9 min-w-0 rounded-xl border-[#AB6E3C]/20 px-3 text-sm dark:border-[#F1DCC4]/16 sm:h-10",
                    showMissingImagesOnly
                      ? "bg-[#E9A35E] text-[#2E2117] hover:bg-[#F0B676] dark:bg-[#E9A35E] dark:hover:bg-[#F0B676]"
                      : "bg-[#FEFAF6] text-[#6F4D35] hover:bg-[#F5EAD8] dark:bg-[#2B1A10]/80 dark:text-[#F1DCC4] dark:hover:bg-[#332116]",
                  )}
                  onClick={() =>
                    setShowMissingImagesOnly((current) => !current)
                  }
                >
                  <ImageOff className="h-4 w-4" />
                  <span className="truncate sm:hidden">
                    {copy.missingImage}
                  </span>
                  <span className="hidden truncate sm:inline">
                    {copy.missingOnly}
                  </span>
                </Button>
              </div>
            </div>
          </section>

          {sourceFilter === "all" || sourceFilter === "branch"
            ? renderMenuItemsSection({
                title: copy.branchItemsTable,
                rows: branchMenuRows,
                emptyMessage: copy.branchItemsEmpty,
              })
            : null}

          {sourceFilter === "all" || sourceFilter === "organization"
            ? renderMenuItemsSection({
                title: copy.sharedItemsTable,
                rows: sharedMenuRows,
                emptyMessage: copy.sharedItemsEmpty,
              })
            : null}
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
        <DialogContent className="rounded-2xl border border-[#AB6E3C]/18 bg-[#FFF7E9] text-[#2E2117] shadow-[0_24px_70px_-36px_rgba(91,58,32,0.55)] dark:border-[#F1DCC4]/14 dark:bg-[#251810] dark:text-[#F7F1E9] sm:max-w-xl">
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
                <p className="text-sm font-medium text-[#6F4D35] dark:text-[#F1DCC4]">
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
                  <SelectTrigger className="h-11 rounded-xl border-[#AB6E3C]/20 bg-[#FEFAF6] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#AB6E3C]/20 bg-[#FFF7E9] text-[#2E2117] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#6F4D35] dark:text-[#F1DCC4]">
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
                  className="h-11 rounded-xl border-[#AB6E3C]/20 bg-[#FEFAF6] text-[#2E2117] placeholder:text-[#B89078] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]"
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
                className="h-11 rounded-xl border-[#AB6E3C]/20 bg-[#FEFAF6] text-[#2E2117] placeholder:text-[#B89078] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]"
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
                className="h-11 rounded-xl border-[#AB6E3C]/20 bg-[#FEFAF6] text-[#2E2117] placeholder:text-[#B89078] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]"
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
                className="h-11 rounded-xl border-[#AB6E3C]/20 bg-[#FEFAF6] text-[#2E2117] placeholder:text-[#B89078] dark:border-[#F1DCC4]/16 dark:bg-[#170F0C] dark:text-[#F7F1E9]"
                placeholder="Tiếng Việt"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              className="rounded-xl bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/20 hover:bg-[#965B2E] dark:bg-[#C8773E] dark:hover:bg-[#D4894E]"
              onClick={handleSaveCategory}
              disabled={isSubmittingCategory}
            >
              {isSubmittingCategory
                ? `${copy.saving}...`
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
          saveButton: isSavingEdit ? `${copy.saving}...` : copy.save,
          cancelButton: copy.cancel,
          title: copy.editBranchItem,
          successMessage: copy.itemUpdated,
          errorMessage: copy.itemUpdateFailed,
        }}
        ownerLanguage={ownerLanguage}
        onTranslate={(text, _field, context) => handleTranslate(text, context)}
        onGenerateDescription={handleGenerateDescription}
        onGenerateAI={handleGenerateAI}
      />
    </div>
  );
}

"use client";
import { useState, useMemo } from "react";
import { CategoryTabs } from "./CategoryTabs";
import { FoodCard, FoodItem } from "./FoodCard";
import { getLocalizedText } from "./utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface Category {
  id: string;
  position: number;
  name_en: string;
  name_ja: string;
  name_vi: string;
  menu_items: FoodItem[];
}

interface Props {
  categories: Category[];
  searchPlaceholder: string;
  locale: string;
  addToCart: (item: FoodItem) => void;
  updateQty?: (id: string, qty: number) => void;
  getQty: (id: string) => number;
  brandColor: string;
  recommended?: FoodItem[];
  canAddItems?: boolean;
}

export function MenuList({
  categories,
  searchPlaceholder,
  locale,
  addToCart,
  updateQty,
  getQty,
  brandColor,
  recommended = [],
  canAddItems = true,
}: Props) {
  const [search, setSearch] = useState("");
  const t = useTranslations("Customer");
  const [active, setActive] = useState(categories[0]?.id);
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();

  const mealContext = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 11) return "breakfast";
    if (hour >= 11 && hour < 15) return "lunch";
    if (hour >= 17 && hour < 22) return "dinner";
    return "other";
  }, []);

  const isWeekend = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }, []);

  const filteredCats = useMemo(() => {
    const keyword = search.toLowerCase();
    const sorted = [...categories].sort((a, b) => {
      const score = (cat: Category) => {
        const name = getLocalizedText(
          cat as unknown as Record<string, unknown>,
          locale,
        ).toLowerCase();
        let s = 0;
        if (isWeekend && /dessert|drink|share/.test(name)) s += 5;
        if (mealContext === "breakfast" && /breakfast|coffee|bakery/.test(name))
          s += 4;
        if (mealContext === "lunch" && /lunch|quick/.test(name)) s += 4;
        if (mealContext === "dinner" && /dinner|meal|main/.test(name)) s += 4;
        return s - cat.position / 10;
      };
      return score(b) - score(a);
    });

    return sorted.map((cat) => ({
      ...cat,
      menu_items: cat.menu_items.filter((item) => {
        const text = getLocalizedText(
          item as unknown as Record<string, unknown>,
          locale,
        ).toLowerCase();
        return (
          text.includes(keyword) &&
          item.available &&
          item.weekday_visibility.includes(today)
        );
      }),
    }));
  }, [search, categories, locale, today, mealContext, isWeekend]);

  const popularItems = useMemo(() => {
    const items = categories.flatMap((c) => c.menu_items);
    return items
      .filter((i) => i.available)
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 5);
  }, [categories]);

  const handleAddToCart = (item: FoodItem) => {
    if (canAddItems) {
      addToCart(item);
    }
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    if (canAddItems && updateQty) {
      updateQty(id, qty);
    }
  };

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 pb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full mt-2 p-2 border rounded-md"
        />
        <CategoryTabs
          categories={categories}
          onSelect={setActive}
          locale={locale}
          activeId={active}
        />
      </div>

      {popularItems.length > 0 && (
        <section className="my-6" aria-label="popular">
          <h2 className="text-xl font-semibold mb-2">
            {t("menu.popular_now")}
          </h2>
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {popularItems.map((item) => (
              <div key={item.id} className="w-40 flex-shrink-0">
                <motion.div
                  whileTap={canAddItems ? { scale: 0.95 } : {}}
                >
                  <FoodCard
                    item={item}
                    qtyInCart={getQty(item.id)}
                    onAdd={() => handleAddToCart(item)}
                    onDecrease={() => handleUpdateQuantity(item.id, getQty(item.id) - 1)}
                    onIncrease={() => handleUpdateQuantity(item.id, getQty(item.id) + 1)}
                    brandColor={brandColor}
                    locale={locale}
                    canAddItems={canAddItems}
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </section>
      )}

      {recommended.length > 0 && (
        <section className="my-6" aria-label="recommended">
          <h2 className="text-xl font-semibold mb-2">
            {t("menu.recommended")}
          </h2>
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {recommended.map((item) => (
              <div key={item.id} className="w-40 flex-shrink-0">
                <motion.div
                  whileTap={canAddItems ? { scale: 0.95 } : {}}
                >
                  <FoodCard
                    item={item}
                    qtyInCart={getQty(item.id)}
                    onAdd={() => handleAddToCart(item)}
                    onDecrease={() => handleUpdateQuantity(item.id, getQty(item.id) - 1)}
                    onIncrease={() => handleUpdateQuantity(item.id, getQty(item.id) + 1)}
                    brandColor={brandColor}
                    locale={locale}
                    canAddItems={canAddItems}
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </section>
      )}

      {filteredCats.map((cat) => (
        <section key={cat.id} className="mb-8" id={`category-${cat.id}`}>
          <h3
            className="text-xl font-semibold mb-3"
            style={{ color: brandColor }}
          >
            {getLocalizedText(
              cat as unknown as Record<string, unknown>,
              locale,
            )}
          </h3>
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {cat.menu_items.map((item) => (
              <div key={item.id} className="w-40 flex-shrink-0">
                <motion.div
                  whileTap={canAddItems ? { scale: 0.95 } : {}}
                >
                  <FoodCard
                    item={item}
                    qtyInCart={getQty(item.id)}
                    onAdd={() => handleAddToCart(item)}
                    onDecrease={() => handleUpdateQuantity(item.id, getQty(item.id) - 1)}
                    onIncrease={() => handleUpdateQuantity(item.id, getQty(item.id) + 1)}
                    brandColor={brandColor}
                    locale={locale}
                    canAddItems={canAddItems}
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

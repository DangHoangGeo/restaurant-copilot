"use client";
import { useState, useMemo } from "react";
import { CategoryTabs } from "./CategoryTabs";
import { FoodCard, FoodItem } from "./FoodCard";
import { getLocalizedText, LocalizedText } from "./utils";

interface Category {
  id: string;
  order: number;
  name: LocalizedText | string;
  items: FoodItem[];
}

interface Props {
  categories: Category[];
  searchPlaceholder: string;
  locale: string;
  addToCart: (item: FoodItem) => void;
  updateQty: (id: string, qty: number) => void;
  getQty: (id: string) => number;
  brandColor: string;
  recommended?: FoodItem[];
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
}: Props) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(categories[0]?.id);
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
  const filteredCats = useMemo(() => {
    const keyword = search.toLowerCase();
    return categories.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        const text = getLocalizedText(item.name, locale).toLowerCase();
        return (
          text.includes(keyword) &&
          item.available &&
          item.weekdayVisibility.includes(today)
        );
      }),
    }));
  }, [search, categories, locale, today]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full mb-4 p-2 border rounded-md"
      />
      <CategoryTabs
        categories={categories}
        onSelect={setActive}
        locale={locale}
        activeId={active}
      />
      {recommended.length > 0 && (
        <section className="my-6" aria-label="recommended">
          <h2 className="text-xl font-semibold mb-2">Recommended</h2>
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {recommended.map((item) => (
              <div key={item.id} className="w-40 flex-shrink-0">
                <FoodCard
                  item={item}
                  qtyInCart={getQty(item.id)}
                  onAdd={() => addToCart(item)}
                  onDecrease={() => updateQty(item.id, getQty(item.id) - 1)}
                  onIncrease={() => updateQty(item.id, getQty(item.id) + 1)}
                  brandColor={brandColor}
                  locale={locale}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {filteredCats.map((cat) => (
        <section key={cat.id} className="mb-8" id={`category-${cat.id}`}>
          <h3
            className="text-xl font-semibold mb-4 pb-2 border-b-2"
            style={{ borderColor: brandColor, color: brandColor }}
          >
            {getLocalizedText(cat.name, locale)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cat.items.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                qtyInCart={getQty(item.id)}
                onAdd={() => addToCart(item)}
                onDecrease={() => updateQty(item.id, getQty(item.id) - 1)}
                onIncrease={() => updateQty(item.id, getQty(item.id) + 1)}
                brandColor={brandColor}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

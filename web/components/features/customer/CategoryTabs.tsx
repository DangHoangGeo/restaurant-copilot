"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Category {
  id: string
  name_en: string
  name_ja: string
  name_vi: string
}

interface Props {
  categories: Category[];
  onSelect: (id: string) => void;
  locale: string;
  activeId?: string;
}

export function CategoryTabs({
  categories,
  onSelect,
  locale,
  activeId,
}: Props) {
  const [current, setCurrent] = useState(activeId || categories[0]?.id);
  const handleClick = (id: string) => {
    setCurrent(id);
    onSelect(id);
  };
  const getText = (cat: Category) => {
    const map: Record<string, string> = {
      en: cat.name_en,
      ja: cat.name_ja,
      vi: cat.name_vi,
    }
    return map[locale] || cat.name_en
  }
  return (
    <div className="flex overflow-x-auto space-x-3 pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleClick(cat.id)}
          className={cn(
            "whitespace-nowrap px-3 py-1 rounded-full text-sm",
            current === cat.id
              ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
          )}
        >
          {getText(cat)}
        </button>
      ))}
    </div>
  );
}

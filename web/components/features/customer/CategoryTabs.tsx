"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

import type { LocalizedText } from "./utils";

interface Category {
  id: string;
  name: LocalizedText | string;
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
  const getText = (obj: LocalizedText | string) =>
    typeof obj === "string" ? obj : obj?.[locale] || obj?.en || "";
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
          {getText(cat.name)}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

interface Category {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  name_pt: string;
}

interface NewsFiltersProps {
  categories: Category[];
  locale: string;
  searchPlaceholder: string;
  allLabel: string;
  sortNewest: string;
  sortOldest: string;
  currentCat?: string;
  currentSort?: string;
  currentQ?: string;
}

export default function NewsFilters({
  categories,
  locale,
  searchPlaceholder,
  allLabel,
  sortNewest,
  sortOldest,
  currentCat = "",
  currentSort = "newest",
  currentQ = "",
}: NewsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeCat = searchParams.get("cat") ?? currentCat;
  const activeSort = searchParams.get("sort") ?? currentSort;

  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearch(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value });
    }, 350);
  }

  function catName(cat: Category) {
    return locale === "en" ? cat.name_en : locale === "pt" ? cat.name_pt : cat.name_es;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: Search + Sort */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors"
          />
          {inputValue && (
            <button
              onClick={() => {
                setInputValue("");
                updateParams({ q: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort toggle */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10 shrink-0">
          <button
            onClick={() => updateParams({ sort: "" })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSort !== "oldest"
                ? "bg-gold text-black"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {sortNewest}
          </button>
          <button
            onClick={() => updateParams({ sort: "oldest" })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSort === "oldest"
                ? "bg-gold text-black"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {sortOldest}
          </button>
        </div>
      </div>

      {/* Row 2: Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParams({ cat: "" })}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            !activeCat
              ? "bg-gold text-black border-gold"
              : "bg-transparent border-white/20 text-muted-foreground hover:border-gold/40 hover:text-white"
          }`}
        >
          {allLabel}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParams({ cat: activeCat === cat.slug ? "" : cat.slug })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCat === cat.slug
                ? "bg-gold text-black border-gold"
                : "bg-transparent border-white/20 text-muted-foreground hover:border-gold/40 hover:text-white"
            }`}
          >
            {catName(cat)}
          </button>
        ))}
      </div>
    </div>
  );
}

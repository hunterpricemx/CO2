"use client";

import { useState } from "react";
import type { InfluencerRow } from "@/modules/influencers/types";
import { InfluencerModal } from "./InfluencerModal";

type Props = {
  influencers: InfluencerRow[];
  locale: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  viewMoreLabel: string;
  streamerCodeLabel: string;
};

export function InfluencersList({
  influencers,
  locale,
  searchPlaceholder,
  noResultsLabel,
  viewMoreLabel,
  streamerCodeLabel,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InfluencerRow | null>(null);

  const filtered = influencers.filter((inf) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      inf.name.toLowerCase().includes(term) ||
      (inf.streamer_code?.toLowerCase().includes(term) ?? false)
    );
  });

  return (
    <>
      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full max-w-md mx-auto block bg-[rgba(26,26,26,0.9)] border border-[rgba(255,215,0,0.2)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold transition-colors"
      />

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-white/40 font-poppins text-sm py-12">{noResultsLabel}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((inf) => {
            const description =
              locale === "en"
                ? inf.description_en
                : locale === "pt"
                  ? inf.description_pt
                  : inf.description_es;

            const socialCount = [
              inf.facebook_url,
              inf.instagram_url,
              inf.tiktok_url,
              inf.youtube_url,
              inf.twitch_url,
            ].filter(Boolean).length;

            return (
              <button
                key={inf.id}
                onClick={() => setSelected(inf)}
                className="text-left rounded-2xl overflow-hidden flex flex-col group transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "rgba(26,26,26,0.9)",
                  border: "1px solid rgba(255,215,0,0.15)",
                }}
              >
                {/* Photo banner */}
                <div className="relative h-40 w-full overflow-hidden bg-black/30">
                  {inf.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={inf.photo_url}
                      alt={inf.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gold/30 text-5xl font-bebas">
                      {inf.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bebas text-xl tracking-widest text-white leading-tight">
                      {inf.name}
                    </h3>
                    {socialCount > 0 && (
                      <span className="text-[10px] text-white/30 font-poppins shrink-0 mt-1">
                        {socialCount} red{socialCount !== 1 ? "es" : ""}
                      </span>
                    )}
                  </div>

                  {description && (
                    <p className="font-poppins text-xs text-white/60 line-clamp-2 flex-1">
                      {description}
                    </p>
                  )}

                  {inf.streamer_code && (
                    <span className="self-start font-mono text-xs bg-[rgba(255,215,0,0.08)] text-[#ffd700] px-2 py-0.5 rounded border border-[rgba(255,215,0,0.2)]">
                      {inf.streamer_code}
                    </span>
                  )}

                  <span className="self-start mt-1 text-xs text-gold/70 font-poppins group-hover:text-gold transition-colors">
                    {viewMoreLabel} →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <InfluencerModal
        influencer={selected}
        locale={locale}
        onClose={() => setSelected(null)}
        streamerCodeLabel={streamerCodeLabel}
      />
    </>
  );
}

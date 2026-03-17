"use client";

import { useState } from "react";
import { Facebook, Instagram, Youtube } from "lucide-react";
import type { InfluencerRow } from "@/modules/influencers/types";
import { InfluencerModal } from "./InfluencerModal";

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
    </svg>
  );
}

const SOCIAL_ICONS: {
  key: keyof InfluencerRow;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { key: "youtube_url",   Icon: Youtube,    color: "text-red-400"    },
  { key: "twitch_url",    Icon: TwitchIcon, color: "text-purple-400" },
  { key: "instagram_url", Icon: Instagram,  color: "text-pink-400"   },
  { key: "tiktok_url",    Icon: TikTokIcon, color: "text-white/70"   },
  { key: "facebook_url",  Icon: Facebook,   color: "text-blue-400"   },
];

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
                {/* Photo banner: 1:1 ratio, influencer always visible, character fades in on hover */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{ aspectRatio: "1 / 1", background: "linear-gradient(160deg,#0d0603 0%,#1a0e00 100%)" }}
                >
                  {/* Influencer photo — always visible */}
                  {inf.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={inf.photo_url}
                      alt={inf.name}
                      className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300 group-hover:opacity-0"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gold/30 text-5xl font-bebas">
                      {inf.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Character photo — fades in on hover */}
                  {inf.character_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={inf.character_photo_url}
                      alt={`${inf.name} personaje`}
                      className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ filter: "drop-shadow(0 0 12px rgba(255,215,0,0.3))" }}
                    />
                  )}

                  {/* Bottom fade */}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="font-bebas text-xl tracking-widest text-white leading-tight">
                    {inf.name}
                  </h3>

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

                  {/* Social icons */}
                  {SOCIAL_ICONS.some((s) => inf[s.key]) && (
                    <div className="flex items-center gap-2 mt-1">
                      {SOCIAL_ICONS.filter((s) => inf[s.key]).map(({ key, Icon, color }) => (
                        <span key={key} className={`${color} opacity-70 group-hover:opacity-100 transition-opacity`}>
                          <Icon className="h-4 w-4" />
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="self-start text-xs text-gold/70 font-poppins group-hover:text-gold transition-colors">
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

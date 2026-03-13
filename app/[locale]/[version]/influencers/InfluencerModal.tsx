"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Copy, Check, ExternalLink, Facebook, Instagram, Youtube } from "lucide-react";
import type { InfluencerRow } from "@/modules/influencers/types";

type Props = {
  influencer: InfluencerRow | null;
  locale: string;
  onClose: () => void;
  streamerCodeLabel: string;
};

const SOCIALS: {
  key: keyof InfluencerRow;
  label: string;
  color: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "youtube_url",   label: "YouTube",   color: "text-red-400",    Icon: Youtube   },
  { key: "twitch_url",    label: "Twitch",    color: "text-purple-400", Icon: TwitchIcon },
  { key: "instagram_url", label: "Instagram", color: "text-pink-400",   Icon: Instagram },
  { key: "tiktok_url",    label: "TikTok",    color: "text-white/80",   Icon: TikTokIcon },
  { key: "facebook_url",  label: "Facebook",  color: "text-blue-400",   Icon: Facebook  },
];

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

export function InfluencerModal({ influencer, locale, onClose, streamerCodeLabel }: Props) {
  const [copied, setCopied] = useState(false);

  if (!influencer) return null;

  const description =
    locale === "en"
      ? influencer.description_en
      : locale === "pt"
        ? influencer.description_pt
        : influencer.description_es;

  async function handleCopy() {
    if (!influencer?.streamer_code) return;
    await navigator.clipboard.writeText(influencer.streamer_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeSocials = SOCIALS.filter((s) => influencer[s.key]);

  return (
    <Dialog open={!!influencer} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden"
        style={{
          background: "#111",
          border: "1px solid rgba(255,215,0,0.2)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Photo */}
        <div className="relative h-52 w-full bg-black/40">
          {influencer.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={influencer.photo_url}
              alt={influencer.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gold/20 text-7xl font-bebas">
              {influencer.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-[#111] via-transparent to-transparent" />
        </div>

        {/* Body */}
        <div className="px-6 pb-6 flex flex-col gap-4 -mt-4 relative z-10">
          {/* Name */}
          <DialogTitle className="font-bebas text-3xl tracking-widest text-white">
            {influencer.name}
          </DialogTitle>

          {/* Description */}
          {description && (
            <p className="font-poppins text-sm text-white/70 leading-relaxed">{description}</p>
          )}

          {/* Streamer code */}
          {influencer.streamer_code && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-white/40 uppercase tracking-wider font-poppins">
                {streamerCodeLabel}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-[#ffd700] bg-[rgba(255,215,0,0.08)] px-3 py-1.5 rounded-lg border border-[rgba(255,215,0,0.2)]">
                  {influencer.streamer_code}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg border border-[rgba(255,215,0,0.2)] text-[#ffd700] hover:bg-[rgba(255,215,0,0.08)] transition-colors"
                  title={copied ? "¡Copiado!" : "Copiar código"}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                {copied && (
                  <span className="text-xs text-green-400 font-poppins">¡Copiado!</span>
                )}
              </div>
            </div>
          )}

          {/* Social links */}
          {activeSocials.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-white/40 uppercase tracking-wider font-poppins">Redes</span>
              <div className="flex flex-wrap gap-2">
                {activeSocials.map(({ key, label, color, Icon }) => (
                  <a
                    key={key}
                    href={influencer[key] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-xs font-poppins font-medium ${color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Link as LinkIcon, Check, Twitter, MessageCircle, Share2 } from "lucide-react";

type Props = {
  url:    string;
  title:  string;
  text?:  string;
  /** Optional discord channel/server invite link to "share to" — if absent, copy-only. */
  className?: string;
};

export function ShareButtons({ url, title, text, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  };

  const onNativeShare = async () => {
    // navigator.share is mobile-friendly; fallback to copy on desktop without it.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch { /* user cancelled */ }
    }
    onCopy();
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — `)}&url=${encodeURIComponent(url)}`;
  const discordCopyText = `${title}\n${url}`;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${
          copied
            ? "bg-green-900/30 border-green-700/40 text-green-300"
            : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
        }`}
        title="Copiar enlace"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
        {copied ? "Copiado" : "Copiar enlace"}
      </button>

      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 text-[#1d9bf0] hover:bg-[#1d9bf0]/20 transition-colors"
      >
        <Twitter className="h-3.5 w-3.5" />
        Tweet
      </a>

      <button
        type="button"
        onClick={async () => {
          try { await navigator.clipboard.writeText(discordCopyText); }
          catch { window.prompt("Pega esto en Discord:", discordCopyText); }
          setCopied(true); setTimeout(() => setCopied(false), 1800);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#5865f2]/10 border border-[#5865f2]/30 text-[#5865f2] hover:bg-[#5865f2]/20 transition-colors"
        title="Copiar formato Discord"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Discord
      </button>

      <button
        type="button"
        onClick={onNativeShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#f39c12]/15 border border-[#f39c12]/30 text-[#f39c12] hover:bg-[#f39c12]/25 transition-colors lg:hidden"
        title="Compartir"
      >
        <Share2 className="h-3.5 w-3.5" />
        Compartir
      </button>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Calendar, User, Tag } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";
import {
  getScreenshotBySlug,
  incrementScreenshotView,
  pickTitle,
  pickDescription,
  pickCategoryName,
} from "@/modules/screenshots";
import { ShareButtons } from "@/components/shared/ShareButtons";
import { ViewIncrementer } from "./ViewIncrementer";

type Props = { params: Promise<{ locale: string; version: string; slug: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://conquerclassicplus.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, version, slug } = await params;
  const s = await getScreenshotBySlug(slug);
  if (!s) return { title: "Screenshot no encontrado" };

  const title = pickTitle(s, locale);
  const desc  = pickDescription(s, locale) || `Screenshot de Conquer Online v${version} subido por ${s.uploader_name ?? "la comunidad"}.`;
  const url   = `${APP_URL}${locale === "es" ? "" : `/${locale}`}/${version}/screenshots/${slug}`;
  const settings = await getSiteSettings();
  void settings;

  return {
    title: `${title} — Screenshots v${version}`,
    description: desc.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description: desc.slice(0, 200),
      url,
      siteName: "Conquer Classic Plus",
      images: [{ url: s.image_url, alt: title, width: 1280, height: 720 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc.slice(0, 200),
      images: [s.image_url],
    },
  };
}

export default async function ScreenshotDetailPage({ params }: Props) {
  const { locale, version, slug } = await params;
  const s = await getScreenshotBySlug(slug);
  if (!s) notFound();

  // Block screenshots that don't belong to the requested version (and aren't 'both').
  if (s.version !== "both" && s.version !== version) {
    const correctHref = locale === "es" ? `/${s.version}/screenshots/${slug}` : `/${locale}/${s.version}/screenshots/${slug}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#080808] p-8">
        <div className="bg-[#111] rounded-2xl p-8 text-center max-w-md border border-white/5">
          <p className="text-gray-400">Esta screenshot pertenece a v{s.version}.</p>
          <Link href={correctHref} className="mt-4 inline-block px-4 py-2 rounded-lg bg-[#f39c12]/20 border border-[#f39c12]/40 text-[#f39c12] hover:bg-[#f39c12]/30">
            Ver en v{s.version} →
          </Link>
        </div>
      </div>
    );
  }

  const title = pickTitle(s, locale);
  const desc  = pickDescription(s, locale);
  const galleryHref = locale === "es" ? `/${version}/screenshots` : `/${locale}/${version}/screenshots`;
  const shareUrl   = `${APP_URL}${locale === "es" ? "" : `/${locale}`}/${version}/screenshots/${slug}`;

  return (
    <div className="min-h-screen" style={{ background: "#080808" }}>
      {/* fire-and-forget view increment client-side after mount */}
      <ViewIncrementer id={s.id} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link href={galleryHref} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver a la galería v{version}
        </Link>

        {/* Imagen */}
        <div className="bg-black/40 rounded-2xl overflow-hidden border border-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image_url}
            alt={title}
            className="w-full h-auto max-h-[80vh] object-contain mx-auto block"
          />
        </div>

        {/* Meta + share */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-3xl font-bebas tracking-widest text-white">{title}</h1>
            {desc && (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{desc}</p>
            )}

            {s.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {s.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-gray-400"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="bg-[#111] rounded-xl p-4 border border-white/5 space-y-2 text-sm">
              {s.category && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 w-20">Categoría</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs">{pickCategoryName(s.category, locale)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 w-20">Versión</span>
                <span className="px-2 py-0.5 rounded-full bg-[#f39c12]/15 border border-[#f39c12]/30 text-[#f39c12] text-xs font-mono">
                  v{s.version === "both" ? "1.0+2.0" : s.version}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <User className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs">{s.uploader_name ?? "anónimo"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs">{new Date(s.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Eye className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs">{s.view_count.toLocaleString("es")} vistas</span>
              </div>
            </div>

            <div className="bg-[#111] rounded-xl p-4 border border-white/5 space-y-3">
              <p className="text-xs uppercase tracking-wider text-gray-500">Compartir</p>
              <ShareButtons url={shareUrl} title={title} text={desc || undefined} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

void incrementScreenshotView; // referenced only by the client component below to keep import tree-shake friendly

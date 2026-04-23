"use client";

import Link from "next/link";
import { ChevronRight, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type TikTokTutorialCard = {
  id: string;
  title: string;
  snippet: string | null;
  catName: string | null;
  authorName: string | null;
  authorHref: string | null;
  versionLabel: string;
  guideHref: string;
  videoUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
};

type Props = {
  items: TikTokTutorialCard[];
  labels: {
    platformBadge: string;
    authorLabel: string;
    openGuide: string;
    playHere: string;
  };
};

export function TikTokTutorialGrid({ items, labels }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      {items.map((item) => (
        <article
          key={item.id}
          className="overflow-hidden rounded-2xl border border-white/10 bg-surface/90 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
        >
          <Dialog>
            <DialogTrigger className="group block w-full border-b border-white/10 bg-black/50 p-3 text-left">
              <div className="relative mx-auto aspect-9/16 w-full max-w-90 overflow-hidden rounded-xl bg-black">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#2b2b2b,black_65%)] text-white/30">
                    <PlayCircle className="h-12 w-12" />
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/16 opacity-90 transition-opacity group-hover:opacity-100">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                    <PlayCircle className="h-8 w-8 text-gold" />
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black via-black/65 to-transparent px-4 py-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur">
                    <PlayCircle className="h-3.5 w-3.5 text-gold" />
                    {labels.platformBadge}
                  </div>
                </div>
              </div>
            </DialogTrigger>

            <DialogContent className="max-w-[min(96vw,980px)] border-white/10 bg-[#0a0a0a] p-3 sm:p-4" showCloseButton>
              <DialogHeader className="px-1 pb-1">
                <DialogTitle className="text-white">{item.title}</DialogTitle>
                <DialogDescription className="text-white/55">
                  {item.authorName ? `${labels.authorLabel}: ${item.authorName}` : labels.platformBadge}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-white/10 bg-black p-2">
                {item.embedUrl ? (
                  <div className="mx-auto w-full max-w-95 overflow-hidden rounded-lg bg-black">
                    <iframe
                      src={item.embedUrl}
                      title={item.title}
                      className="aspect-9/16 w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="flex aspect-9/16 items-center justify-center rounded-lg bg-[radial-gradient(circle_at_top,#2b2b2b,black_65%)] text-white/40">
                    <PlayCircle className="h-12 w-12" />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              {item.catName && (
                <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
                  {item.catName}
                </span>
              )}
              <Badge variant="outline" className="ml-auto border-gold/20 text-[11px] text-muted-foreground">
                v{item.versionLabel}
              </Badge>
            </div>

            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-white">
              {item.title}
            </h2>

            {item.authorName && (
              <p className="text-[11px] uppercase tracking-wider text-white/45">
                {labels.authorLabel}:{" "}
                {item.authorHref ? (
                  <Link href={item.authorHref} className="text-white/75 transition-colors hover:text-gold">
                    {item.authorName}
                  </Link>
                ) : (
                  <span className="text-white/75">{item.authorName}</span>
                )}
              </p>
            )}

            {item.snippet && (
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {item.snippet}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-4 pt-2">
              <Dialog>
                <DialogTrigger className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white">
                  {labels.playHere}
                  <PlayCircle className="h-3.5 w-3.5" />
                </DialogTrigger>

                <DialogContent className="max-w-[min(96vw,980px)] border-white/10 bg-[#0a0a0a] p-3 sm:p-4" showCloseButton>
                  <DialogHeader className="px-1 pb-1">
                    <DialogTitle className="text-white">{item.title}</DialogTitle>
                    <DialogDescription className="text-white/55">
                      {item.authorName ? `${labels.authorLabel}: ${item.authorName}` : labels.platformBadge}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="rounded-xl border border-white/10 bg-black p-2">
                    {item.embedUrl ? (
                      <div className="mx-auto w-full max-w-95 overflow-hidden rounded-lg bg-black">
                        <iframe
                          src={item.embedUrl}
                          title={item.title}
                          className="aspect-9/16 w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-9/16 items-center justify-center rounded-lg bg-[radial-gradient(circle_at_top,#2b2b2b,black_65%)] text-white/40">
                        <PlayCircle className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Link
                href={item.guideHref}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gold transition-colors hover:text-gold/80"
              >
                {labels.openGuide}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

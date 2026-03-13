"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PromoSlide } from "@/lib/site-settings";

type Props = {
  slides: PromoSlide[];
};

export function PromoSlider({ slides }: Props) {
  const [current, setCurrent] = useState(0);

  const valid = slides.filter((s) => s.image_url);

  useEffect(() => {
    if (valid.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % valid.length);
    }, 4000);
    return () => clearInterval(id);
  }, [valid.length]);

  if (valid.length === 0) return null;

  const slide = valid[current];

  const inner = (
    <div className="relative w-full h-full overflow-hidden rounded-xl group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.image_url}
        alt={slide.title ?? "Promo"}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {slide.title && (
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-linear-to-t from-black/80 to-transparent">
          <p className="font-poppins text-sm text-white font-semibold line-clamp-1">{slide.title}</p>
        </div>
      )}
      {/* Dots */}
      {valid.length > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {valid.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-gold w-3" : "bg-white/40"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (slide.link_url) {
    return (
      <Link href={slide.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
        {inner}
      </Link>
    );
  }

  return <div className="w-full h-full">{inner}</div>;
}

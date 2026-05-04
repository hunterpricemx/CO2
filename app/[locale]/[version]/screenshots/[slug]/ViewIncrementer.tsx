"use client";

import { useEffect } from "react";
import { incrementScreenshotView } from "@/modules/screenshots/actions";

export function ViewIncrementer({ id }: { id: string }) {
  useEffect(() => {
    void incrementScreenshotView(id);
  }, [id]);
  return null;
}

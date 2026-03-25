import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getGameSession();
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type === "video/mp4" || file.type === "video/quicktime";
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
  }

  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50 MB video, 10 MB image
  if (file.size > maxSize) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `garment-refs/${session.username}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabase = await createAdminClient();
  const { error } = await supabase.storage
    .from("conquer-media")
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("conquer-media").getPublicUrl(fileName);
  return NextResponse.json({ url: data.publicUrl });
}

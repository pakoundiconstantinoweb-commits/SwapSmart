import { supabase } from "@/integrations/supabase/client";

const ITEM_BUCKET = "item-images";

export function getStoragePathFromPublicUrl(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function deleteItemImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return;
  const path = getStoragePathFromPublicUrl(imageUrl, ITEM_BUCKET);
  if (!path) return;
  const { error } = await supabase.storage.from(ITEM_BUCKET).remove([path]);
  if (error) throw error;
}

export async function uploadItemImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(ITEM_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from(ITEM_BUCKET).getPublicUrl(path).data.publicUrl;
}

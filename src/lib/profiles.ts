import { supabase } from "@/integrations/supabase/client";

export type ProfileSummary = {
  id: string;
  username: string;
  avatar_url: string | null;
  location?: string | null;
};

export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileSummary>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, location")
    .in("id", unique);

  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p]));
}

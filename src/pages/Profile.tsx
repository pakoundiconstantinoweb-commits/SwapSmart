import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ItemCard } from "@/components/ItemCard";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", location: "", bio: "" });

  useEffect(() => {
    if (profile) setForm({ username: profile.username ?? "", location: profile.location ?? "", bio: profile.bio ?? "" });
  }, [profile]);

  const { data: myItems = [] } = useQuery({
    queryKey: ["my-items", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title,image_url,points,location,created_at,status")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Image < 3 Mo");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Avatar mis à jour");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.username.trim().length < 2) return toast.error("Pseudo trop court");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: form.username.trim().slice(0, 40),
        location: form.location.trim().slice(0, 100) || null,
        bio: form.bio.trim().slice(0, 300) || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profil mis à jour");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground mt-1">Gère ton compte et tes annonces</p>
      </header>

      <form onSubmit={save} className="bg-card border rounded-2xl p-6 grid md:grid-cols-[auto,1fr] gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile?.username?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full h-8 w-8 grid place-items-center cursor-pointer">
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
              />
            </label>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{profile?.points ?? 0}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="username">Pseudo</Label>
            <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} maxLength={40} className="h-11 mt-1.5" />
          </div>
          <div>
            <Label htmlFor="loc">Localisation par défaut</Label>
            <Input id="loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={100} placeholder="ex. Lomé" className="h-11 mt-1.5" />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={300} rows={3} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={saving} className="h-11">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</> : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>

      <section>
        <h2 className="text-2xl font-bold mb-4">Mes annonces ({myItems.length})</h2>
        {myItems.length === 0 ? (
          <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">
            Tu n’as publié aucun objet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myItems.map((i) => <ItemCard key={i.id} item={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}

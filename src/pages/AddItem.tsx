import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ITEM_CATEGORIES, ITEM_CONDITIONS, type ItemCategory, type ItemCondition } from "@/lib/itemMeta";
import { itemFormSchema } from "@/lib/itemFormSchema";
import { uploadItemImage } from "@/lib/itemStorage";

export default function AddItem() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    points: 50,
    location: "",
    category: "Autre" as ItemCategory,
    condition: "Bon état" as ItemCondition,
  });

  useEffect(() => {
    if (profile?.location && !form.location) {
      setForm((f) => ({ ...f, location: profile.location ?? "" }));
    }
  }, [profile?.location]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("L’image doit faire moins de 5 Mo");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = itemFormSchema.safeParse({
      title: form.title,
      description: form.description || undefined,
      points: Number(form.points),
      location: form.location || undefined,
      category: form.category,
      condition: form.condition,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (file) {
        image_url = await uploadItemImage(user.id, file);
      }
      const { error } = await supabase.from("items").insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        points: parsed.data.points,
        location: parsed.data.location ?? null,
        category: parsed.data.category,
        condition: parsed.data.condition,
        image_url,
      });
      if (error) throw error;
      toast.success("Objet ajouté !");
      navigate("/marketplace");
    } catch (err: any) {
      toast.error(err.message ?? "Impossible d’ajouter l’objet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Ajouter un objet</h1>
      <p className="text-muted-foreground mb-8">Publie un objet que tu veux échanger contre des points</p>

      <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 space-y-5">
        <div>
          <Label>Image</Label>
          <label className="mt-1.5 block border-2 border-dashed rounded-xl cursor-pointer hover:border-primary transition-colors overflow-hidden">
            {preview ? (
              <img src={preview} alt="preview" className="w-full max-h-72 object-cover" />
            ) : (
              <div className="p-10 text-center text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Clique pour importer une image</p>
                <p className="text-xs mt-1">Max 5 Mo</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div>
          <Label htmlFor="title">Titre *</Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={100} className="h-11 mt-1.5" />
        </div>

        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} maxLength={1000} className="mt-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Catégorie *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ItemCategory })}>
              <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>État *</Label>
            <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v as ItemCondition })}>
              <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ITEM_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="points">Points *</Label>
            <Input id="points" type="number" min={0} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} required className="h-11 mt-1.5" />
          </div>
          <div>
            <Label htmlFor="location">Localisation</Label>
            <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={100} placeholder="ex. Lomé" className="h-11 mt-1.5" />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full h-11">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publication...</> : "Publier l’objet"}
        </Button>
      </form>
    </div>
  );
}

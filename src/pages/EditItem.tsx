import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
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
import { deleteItemImage, uploadItemImage } from "@/lib/itemStorage";

export default function EditItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
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

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["item", id],
    enabled: !!id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!item) return;
    setForm({
      title: item.title,
      description: item.description ?? "",
      points: item.points,
      location: item.location ?? "",
      category: (item.category as ItemCategory) ?? "Autre",
      condition: (item.condition as ItemCondition) ?? "Bon état",
    });
    if (item.image_url && !file) setPreview(item.image_url);
  }, [item, file]);

  useEffect(() => {
    if (!isLoading && item && user && item.user_id !== user.id) {
      toast.error("Tu ne peux modifier que tes propres objets");
      navigate(`/items/${id}`);
    }
    if (!isLoading && item?.status === "swapped") {
      toast.error("Un objet déjà échangé ne peut plus être modifié");
      navigate(`/items/${id}`);
    }
  }, [item, user, isLoading, id, navigate]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("L’image doit faire moins de 5 Mo");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !item || item.user_id !== user.id) return;

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
      let image_url = item.image_url;
      if (file) {
        const newUrl = await uploadItemImage(user.id, file);
        if (item.image_url) {
          try {
            await deleteItemImage(item.image_url);
          } catch {
            /* keep going if old image cleanup fails */
          }
        }
        image_url = newUrl;
      }

      const { error } = await supabase
        .from("items")
        .update({
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          points: parsed.data.points,
          location: parsed.data.location ?? null,
          category: parsed.data.category,
          condition: parsed.data.condition,
          image_url,
        })
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Objet mis à jour !");
      qc.invalidateQueries({ queryKey: ["item", id] });
      qc.invalidateQueries({ queryKey: ["marketplace-items"] });
      qc.invalidateQueries({ queryKey: ["my-items"] });
      navigate(`/items/${item.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de modifier l’objet";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-10">Chargement...</div>;
  if (isError || !item) return <div className="p-10">Objet introuvable.</div>;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <Link
        to={`/items/${id}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à l’objet
      </Link>

      <h1 className="text-3xl font-bold mb-2">Modifier l’objet</h1>
      <p className="text-muted-foreground mb-8">Mets à jour les informations de ton annonce</p>

      <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 space-y-5">
        <div>
          <Label>Image</Label>
          <label className="mt-1.5 block border-2 border-dashed rounded-xl cursor-pointer hover:border-primary transition-colors overflow-hidden">
            {preview ? (
              <img src={preview} alt="preview" className="w-full max-h-72 object-cover" />
            ) : (
              <div className="p-10 text-center text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Clique pour changer l’image</p>
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
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            maxLength={100}
            className="h-11 mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            maxLength={1000}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Catégorie *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ItemCategory })}>
              <SelectTrigger className="h-11 mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>État *</Label>
            <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v as ItemCondition })}>
              <SelectTrigger className="h-11 mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="points">Points *</Label>
            <Input
              id="points"
              type="number"
              min={0}
              value={form.points}
              onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
              required
              className="h-11 mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="location">Localisation</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              maxLength={100}
              placeholder={profile?.location ?? "ex. Lomé"}
              className="h-11 mt-1.5"
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full h-11">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...
            </>
          ) : (
            "Enregistrer les modifications"
          )}
        </Button>
      </form>
    </div>
  );
}

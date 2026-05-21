import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemCard } from "@/components/ItemCard";
import { useAuth } from "@/hooks/useAuth";
import { ITEM_CATEGORIES, ITEM_CONDITIONS } from "@/lib/itemMeta";

export default function Marché() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [maxPoints, setMaxPoints] = useState("all");
  const [location, setLocalisation] = useState("all");
  const [category, setCategory] = useState("all");
  const [condition, setCondition] = useState("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["marketplace-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title,image_url,points,location,created_at,status,user_id,category,condition")
        .eq("status", "available")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let r = items.filter((i) => i.user_id !== user?.id);
    if (q) r = r.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()));
    if (location !== "all") r = r.filter((i) => i.location === location);
    if (category !== "all") r = r.filter((i: any) => i.category === category);
    if (condition !== "all") r = r.filter((i: any) => i.condition === condition);
    if (maxPoints !== "all") {
      const max = parseInt(maxPoints);
      r = r.filter((i) => i.points <= max);
    }
    if (sort === "points-asc") r = [...r].sort((a, b) => a.points - b.points);
    if (sort === "points-desc") r = [...r].sort((a, b) => b.points - a.points);
    return r;
  }, [items, q, sort, location, maxPoints, category, condition, user?.id]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Marché</h1>
        <p className="text-muted-foreground mt-1">Découvre des objets à échanger avec tes points</p>
      </header>

      <div className="bg-card border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-12 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher des objets..." className="pl-10 h-10" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="md:col-span-3 h-10"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {ITEM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger className="md:col-span-3 h-10"><SelectValue placeholder="État" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les états</SelectItem>
            {ITEM_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocalisation}>
          <SelectTrigger className="md:col-span-2 h-10"><SelectValue placeholder="Lieu" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les localisations</SelectItem>
            {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={maxPoints} onValueChange={setMaxPoints}>
          <SelectTrigger className="md:col-span-2 h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les points</SelectItem>
            <SelectItem value="50">≤ 50</SelectItem>
            <SelectItem value="100">≤ 100</SelectItem>
            <SelectItem value="500">≤ 500</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="md:col-span-2 h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Plus récents</SelectItem>
            <SelectItem value="points-asc">Points ↑</SelectItem>
            <SelectItem value="points-desc">Points ↓</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">
          Aucun objet ne correspond à tes filtres.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

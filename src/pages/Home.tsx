import { Link } from "react-router-dom";
import { TrendingUp, RefreshCw, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { StatCard } from "@/components/StatCard";
import { ItemCard } from "@/components/ItemCard";

export default function Home() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const { data: itemCount = 0 } = useQuery({
    queryKey: ["my-item-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
  });

  const { data: msgCount = 0 } = useQuery({
    queryKey: ["unread-msg-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("read", false);
      return count ?? 0;
    },
  });

  const { data: recentItems = [] } = useQuery({
    queryKey: ["recent-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title,image_url,points,location,created_at,status")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentMessages = [] } = useQuery({
    queryKey: ["recent-messages", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,content,created_at,sender_id,receiver_id")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Bon retour, {profile?.username ?? "toi"} !</h1>
        <p className="text-muted-foreground mt-1">Voici ce qui se passe sur ton compte</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Points disponibles"
          value={profile?.points ?? 0}
          icon={TrendingUp}
          linkLabel="Parcourir le marché"
          linkTo="/marketplace"
          variant="primary"
        />
        <StatCard
          title="Tes objets"
          value={itemCount}
          icon={RefreshCw}
          linkLabel="Voir tous les objets"
          linkTo="/profile"
          variant="soft-purple"
        />
        <StatCard
          title="Messages"
          value={msgCount}
          icon={MessageSquare}
          linkLabel="Aller aux messages"
          linkTo="/messages"
          variant="soft-amber"
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Annonces récentes</h2>
          <Link to="/marketplace" className="text-primary font-medium hover:underline">Voir tout</Link>
        </div>
        {recentItems.length === 0 ? (
          <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">
            Aucun objet pour le moment. <Link to="/add-item" className="text-primary font-medium">Ajouter le premier</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentItems.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Messages récents</h2>
          <Link to="/messages" className="text-primary font-medium hover:underline">Voir tout</Link>
        </div>
        {recentMessages.length === 0 ? (
          <div className="bg-card border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Aucun message pour le moment.</p>
            <Link to="/marketplace" className="text-primary font-medium mt-2 inline-block">Trouver des objets à échanger</Link>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl divide-y">
            {recentMessages.map((m) => (
              <Link key={m.id} to="/messages" className="block p-4 hover:bg-muted/40">
                <p className="text-sm line-clamp-1">{m.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

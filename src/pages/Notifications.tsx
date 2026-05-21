import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Inbox } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: incoming = [] } = useQuery({
    queryKey: ["incoming-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("swap_requests")
        .select("*, items(title, image_url), profiles!swap_requests_buyer_id_fkey(username, avatar_url)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: outgoing = [] } = useQuery({
    queryKey: ["outgoing-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("swap_requests")
        .select("*, items(title, image_url)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const accept = async (id: string) => {
    const { error } = await supabase.rpc("accept_swap_request", { _request_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Échange accepté !");
      qc.invalidateQueries();
    }
  };

  const decline = async (id: string) => {
    const { error } = await supabase.from("swap_requests").update({ status: "declined" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Demande refusée");
      qc.invalidateQueries({ queryKey: ["incoming-requests", user?.id] });
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-warning/15 text-warning border-warning/30",
      accepted: "bg-success/15 text-success border-success/30",
      declined: "bg-destructive/15 text-destructive border-destructive/30",
      cancelled: "bg-muted text-muted-foreground border",
    };
    return map[s] ?? "";
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-1">Gère les demandes d’échange reçues et envoyées</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Demandes reçues</h2>
        {incoming.length === 0 ? (
          <div className="bg-card border rounded-2xl p-10 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2" /> Aucune demande reçue.
          </div>
        ) : (
          <ul className="space-y-3">
            {incoming.map((r) => (
              <li key={r.id} className="bg-card border rounded-2xl p-4 flex items-center gap-4">
                <img
                  src={r.items?.image_url ?? "/placeholder.svg"}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.items?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    De <strong>{r.profiles?.username}</strong> · {r.points} pts
                  </p>
                  {r.message && <p className="text-sm mt-1 line-clamp-2">"{r.message}"</p>}
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), "d MMM, HH:mm", { locale: fr })}</p>
                </div>
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => decline(r.id)}>
                      <X className="h-4 w-4 mr-1" /> Refuser
                    </Button>
                    <Button size="sm" onClick={() => accept(r.id)}>
                      <Check className="h-4 w-4 mr-1" /> Accepter
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Mes demandes envoyées</h2>
        {outgoing.length === 0 ? (
          <div className="bg-card border rounded-2xl p-10 text-center text-muted-foreground">
            Tu n’as envoyé aucune demande pour le moment.
          </div>
        ) : (
          <ul className="space-y-3">
            {outgoing.map((r) => (
              <li key={r.id} className="bg-card border rounded-2xl p-4 flex items-center gap-4">
                <img src={r.items?.image_url ?? "/placeholder.svg"} alt="" className="h-16 w-16 rounded-lg object-cover bg-muted" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.items?.title}</p>
                  <p className="text-sm text-muted-foreground">{r.points} pts</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), "d MMM, HH:mm", { locale: fr })}</p>
                </div>
                <Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

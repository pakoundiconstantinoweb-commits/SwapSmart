import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Inbox } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchProfilesByIds } from "@/lib/profiles";

async function releaseItemIfNoPending(itemId: string) {
  const { count, error } = await supabase
    .from("swap_requests")
    .select("*", { count: "exact", head: true })
    .eq("item_id", itemId)
    .eq("status", "pending");
  if (error) throw error;
  if (count === 0) {
    await supabase
      .from("items")
      .update({ status: "available" })
      .eq("id", itemId)
      .eq("status", "pending");
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: incoming = [] } = useQuery({
    queryKey: ["incoming-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("swap_requests")
        .select("*, items(title, image_url)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const buyerIds = (data ?? []).map((r) => r.buyer_id);
      const profiles = await fetchProfilesByIds(buyerIds);

      return (data ?? []).map((r) => ({
        ...r,
        buyer: profiles.get(r.buyer_id) ?? null,
      }));
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
      return data;
    },
  });

  const accept = async (id: string, itemId: string) => {
    const { error } = await supabase.rpc("accept_swap_request", { _request_id: id });
    if (error) {
      if (error.message.includes("no longer available")) {
        toast.error(
          "Impossible d’accepter : mets à jour la base Supabase (migration accept_swap_request) ou l’objet n’est plus disponible."
        );
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Échange accepté !");
    qc.invalidateQueries({ queryKey: ["incoming-requests", user?.id] });
    qc.invalidateQueries({ queryKey: ["outgoing-requests", user?.id] });
    qc.invalidateQueries({ queryKey: ["marketplace-items"] });
    qc.invalidateQueries({ queryKey: ["my-items"] });
    qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    qc.invalidateQueries({ queryKey: ["item", itemId] });
  };

  const decline = async (id: string, itemId: string) => {
    const { error } = await supabase
      .from("swap_requests")
      .update({ status: "declined" })
      .eq("id", id)
      .eq("seller_id", user!.id)
      .eq("status", "pending");
    if (error) {
      toast.error(error.message);
      return;
    }
    try {
      await releaseItemIfNoPending(itemId);
      toast.success("Demande refusée");
      qc.invalidateQueries({ queryKey: ["incoming-requests", user?.id] });
      qc.invalidateQueries({ queryKey: ["marketplace-items"] });
      qc.invalidateQueries({ queryKey: ["item", itemId] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du refus";
      toast.error(msg);
    }
  };

  const cancelOutgoing = async (id: string, itemId: string) => {
    const { error } = await supabase
      .from("swap_requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("buyer_id", user!.id)
      .eq("status", "pending");
    if (error) {
      toast.error(error.message);
      return;
    }
    try {
      await releaseItemIfNoPending(itemId);
      toast.success("Demande annulée");
      qc.invalidateQueries({ queryKey: ["outgoing-requests", user?.id] });
      qc.invalidateQueries({ queryKey: ["marketplace-items"] });
      qc.invalidateQueries({ queryKey: ["my-pending-swap", itemId, user?.id] });
      qc.invalidateQueries({ queryKey: ["item", itemId] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l’annulation";
      toast.error(msg);
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

  const statusLabel: Record<string, string> = {
    pending: "en attente",
    accepted: "acceptée",
    declined: "refusée",
    cancelled: "annulée",
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
                    De <strong>{r.buyer?.username ?? "Utilisateur"}</strong> · {r.points} pts
                  </p>
                  {r.message && <p className="text-sm mt-1 line-clamp-2">"{r.message}"</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(r.created_at), "d MMM, HH:mm", { locale: fr })}
                  </p>
                </div>
                {r.status === "pending" ? (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => decline(r.id, r.item_id)}>
                      <X className="h-4 w-4 mr-1" /> Refuser
                    </Button>
                    <Button size="sm" onClick={() => accept(r.id, r.item_id)}>
                      <Check className="h-4 w-4 mr-1" /> Accepter
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className={statusBadge(r.status)}>
                    {statusLabel[r.status] ?? r.status}
                  </Badge>
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
            {outgoing.map(
              (r: {
                id: string;
                item_id: string;
                points: number;
                status: string;
                created_at: string;
                items?: { title?: string; image_url?: string | null };
              }) => (
                <li key={r.id} className="bg-card border rounded-2xl p-4 flex items-center gap-4">
                  <img
                    src={r.items?.image_url ?? "/placeholder.svg"}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.items?.title}</p>
                    <p className="text-sm text-muted-foreground">{r.points} pts</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.created_at), "d MMM, HH:mm", { locale: fr })}
                    </p>
                  </div>
                  {r.status === "pending" ? (
                    <Button size="sm" variant="outline" onClick={() => cancelOutgoing(r.id, r.item_id)}>
                      Annuler
                    </Button>
                  ) : (
                    <Badge variant="outline" className={statusBadge(r.status)}>
                      {statusLabel[r.status] ?? r.status}
                    </Badge>
                  )}
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

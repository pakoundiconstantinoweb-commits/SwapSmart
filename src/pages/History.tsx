import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function History() {
  const { user } = useAuth();
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`from_user.eq.${user!.id},to_user.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Historique des transactions</h1>
        <p className="text-muted-foreground mt-1">Tous tes échanges terminés</p>
      </header>

      {txs.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">
          <Receipt className="h-10 w-10 mx-auto mb-3" /> Aucune transaction pour le moment.
        </div>
      ) : (
        <ul className="bg-card border rounded-2xl divide-y overflow-hidden">
          {txs.map((t) => {
            const incoming = t.to_user === user?.id;
            return (
              <li key={t.id} className="flex items-center gap-4 p-4">
                <div className={`h-10 w-10 rounded-full grid place-items-center ${incoming ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                  {incoming ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.item_title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "d MMM yyyy · HH:mm", { locale: fr })}</p>
                </div>
                <div className={`font-bold ${incoming ? "text-success" : "text-warning"}`}>
                  {incoming ? "+" : "-"}{t.points} pts
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Msg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
};

export default function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const initialPeer = params.get("with");
  const [activePeer, setActivePeer] = useState<string | null>(initialPeer);
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["all-messages", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
  });

  // Construire la liste des contacts
  const peerIds = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => set.add(m.sender_id === user?.id ? m.receiver_id : m.sender_id));
    if (initialPeer) set.add(initialPeer);
    return Array.from(set);
  }, [messages, user?.id, initialPeer]);

  const { data: peers = [] } = useQuery({
    queryKey: ["peers", peerIds.sort().join(",")],
    enabled: peerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", peerIds);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!activePeer && peerIds.length > 0) setActivePeer(peerIds[0]);
  }, [peerIds, activePeer]);

  // Temps réel
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("messages-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["all-messages", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  // Marquer comme lu
  useEffect(() => {
    if (!activePeer || !user) return;
    supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", user.id)
      .eq("sender_id", activePeer)
      .eq("read", false)
      .then(() => qc.invalidateQueries({ queryKey: ["unread-msg-count", user.id] }));
  }, [activePeer, user, messages.length, qc]);

  const conversation = useMemo(
    () => messages.filter((m) =>
      (m.sender_id === activePeer && m.receiver_id === user?.id) ||
      (m.sender_id === user?.id && m.receiver_id === activePeer)
    ),
    [messages, activePeer, user?.id]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePeer || !text.trim()) return;
    const content = text.trim().slice(0, 2000);
    setText("");
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activePeer,
      content,
    });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["all-messages", user.id] });
  };

  const peerInfo = (id: string) => peers.find((p) => p.id === id);
  const lastMsg = (id: string) => {
    const list = messages.filter((m) => m.sender_id === id || m.receiver_id === id);
    return list[list.length - 1];
  };

  const activeProfile = activePeer ? peerInfo(activePeer) : null;

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex">
      <aside className="w-72 border-r bg-card overflow-y-auto hidden md:block">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">Messages</h2>
        </div>
        {peerIds.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune conversation pour le moment.</p>
        ) : (
          <ul>
            {peerIds.map((pid) => {
              const p = peerInfo(pid);
              const lm = lastMsg(pid);
              return (
                <li key={pid}>
                  <button
                    onClick={() => { setActivePeer(pid); setParams({}); }}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left ${activePeer === pid ? "bg-primary-soft" : ""}`}
                  >
                    <Avatar className="h-10 w-10">
                      {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                      <AvatarFallback className="bg-primary text-primary-foreground">{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{p?.username ?? "Utilisateur"}</p>
                      {lm && <p className="text-xs text-muted-foreground truncate">{lm.content}</p>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        {!activePeer ? (
          <div className="flex-1 grid place-items-center text-muted-foreground p-6 text-center">
            Sélectionne une conversation pour commencer.
          </div>
        ) : (
          <>
            <header className="border-b p-4 flex items-center gap-3 bg-card">
              <Avatar>
                {activeProfile?.avatar_url && <AvatarImage src={activeProfile.avatar_url} />}
                <AvatarFallback className="bg-primary text-primary-foreground">{activeProfile?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold">{activeProfile?.username ?? "Utilisateur"}</h3>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
              {conversation.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm mt-6">Commence la conversation</p>
              ) : conversation.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`text-[10px] mt-1 ${m.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {format(new Date(m.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="p-3 border-t bg-card flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message..." maxLength={2000} className="h-11" />
              <Button type="submit" size="icon" className="h-11 w-11"><Send className="h-4 w-4" /></Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

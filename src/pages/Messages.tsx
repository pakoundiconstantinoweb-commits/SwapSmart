import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
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
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPeer) setActivePeer(initialPeer);
  }, [initialPeer]);

  const { data: messages = [], isError: messagesError } = useQuery({
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

  const peerIds = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => set.add(m.sender_id === user?.id ? m.receiver_id : m.sender_id));
    if (initialPeer && initialPeer !== user?.id) set.add(initialPeer);
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

  const { data: linkedPeer } = useQuery({
    queryKey: ["peer-profile", initialPeer],
    enabled: !!initialPeer && !!user?.id && initialPeer !== user.id && !peers.some((p) => p.id === initialPeer),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", initialPeer!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const allPeers = useMemo(() => {
    if (linkedPeer && !peers.some((p) => p.id === linkedPeer.id)) {
      return [...peers, linkedPeer];
    }
    return peers;
  }, [peers, linkedPeer]);

  useEffect(() => {
    if (!activePeer && peerIds.length > 0 && !initialPeer) setActivePeer(peerIds[0]);
  }, [peerIds, activePeer, initialPeer]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("messages-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["all-messages", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  useEffect(() => {
    if (!activePeer || !user) return;
    const markRead = async () => {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", user.id)
        .eq("sender_id", activePeer)
        .eq("read", false);
      if (!error) {
        qc.invalidateQueries({ queryKey: ["unread-msg-count", user.id] });
        qc.invalidateQueries({ queryKey: ["all-messages", user.id] });
      }
    };
    markRead();
  }, [activePeer, user, qc]);

  const conversation = useMemo(
    () =>
      messages.filter(
        (m) =>
          (m.sender_id === activePeer && m.receiver_id === user?.id) ||
          (m.sender_id === user?.id && m.receiver_id === activePeer)
      ),
    [messages, activePeer, user?.id]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length]);

  const selectPeer = (pid: string) => {
    setActivePeer(pid);
    setParams({ with: pid });
  };

  const backToList = () => {
    setActivePeer(null);
    setParams({});
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePeer || !text.trim() || sending) return;
    if (activePeer === user.id) {
      toast.error("Impossible de s’envoyer un message à soi-même");
      return;
    }

    const content = text.trim().slice(0, 2000);
    setSending(true);
    setText("");

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activePeer,
      content,
    });

    setSending(false);
    if (error) {
      setText(content);
      toast.error(error.message);
    } else {
      qc.invalidateQueries({ queryKey: ["all-messages", user.id] });
    }
  };

  const peerInfo = (id: string) => allPeers.find((p) => p.id === id);
  const lastMsg = (id: string) => {
    const list = messages.filter((m) => m.sender_id === id || m.receiver_id === id);
    return list[list.length - 1];
  };

  const activeProfile = activePeer ? peerInfo(activePeer) : null;
  const showMobileChat = !!activePeer;

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex">
      <aside
        className={`w-full md:w-72 border-r bg-card overflow-y-auto shrink-0 ${
          showMobileChat ? "hidden md:block" : "block"
        }`}
      >
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">Messages</h2>
        </div>
        {messagesError ? (
          <p className="p-4 text-sm text-destructive">Impossible de charger les messages.</p>
        ) : peerIds.length === 0 && !initialPeer ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune conversation pour le moment.</p>
        ) : peerIds.length === 0 && initialPeer ? (
          <ul>
            <li>
              <button
                type="button"
                onClick={() => selectPeer(initialPeer)}
                className="w-full flex items-center gap-3 p-3 bg-primary-soft text-left"
              >
                <Avatar className="h-10 w-10">
                  {linkedPeer?.avatar_url && <AvatarImage src={linkedPeer.avatar_url} />}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {linkedPeer?.username?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{linkedPeer?.username ?? "Utilisateur"}</p>
                  <p className="text-xs text-muted-foreground">Nouvelle conversation</p>
                </div>
              </button>
            </li>
          </ul>
        ) : (
          <ul>
            {peerIds.map((pid) => {
              const p = peerInfo(pid);
              const lm = lastMsg(pid);
              const unread = messages.some(
                (m) => m.sender_id === pid && m.receiver_id === user?.id && !m.read
              );
              return (
                <li key={pid}>
                  <button
                    type="button"
                    onClick={() => selectPeer(pid)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left ${
                      activePeer === pid ? "bg-primary-soft" : ""
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {p?.username?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${unread ? "text-foreground" : ""}`}>
                        {p?.username ?? "Utilisateur"}
                      </p>
                      {lm && (
                        <p className={`text-xs truncate ${unread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {lm.content}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section
        className={`flex-1 flex flex-col min-w-0 ${!showMobileChat ? "hidden md:flex" : "flex"}`}
      >
        {!activePeer ? (
          <div className="flex-1 grid place-items-center text-muted-foreground p-6 text-center">
            Sélectionne une conversation pour commencer.
          </div>
        ) : (
          <>
            <header className="border-b p-4 flex items-center gap-3 bg-card">
              <button
                type="button"
                className="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground"
                onClick={backToList}
                aria-label="Retour aux conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar>
                {activeProfile?.avatar_url && <AvatarImage src={activeProfile.avatar_url} />}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {activeProfile?.username?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold">{activeProfile?.username ?? "Utilisateur"}</h3>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
              {conversation.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm mt-6">Commence la conversation</p>
              ) : (
                conversation.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        m.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          m.sender_id === user?.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(m.created_at), "HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="p-3 border-t bg-card flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Écrire un message..."
                maxLength={2000}
                className="h-11"
                disabled={sending}
              />
              <Button type="submit" size="icon" className="h-11 w-11" disabled={sending || !text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

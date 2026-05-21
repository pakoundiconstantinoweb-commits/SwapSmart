import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, ImageOff, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*, profiles!items_user_id_fkey(username, avatar_url, location)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <div className="p-10">Chargement...</div>;
  if (!item) return <div className="p-10">Objet introuvable.</div>;

  const isOwner = user?.id === item.user_id;
  const owner = item.profiles;

  const handleRequest = async () => {
    if (!user) return;
    if ((profile?.points ?? 0) < item.points) {
      toast.error("Tu n’as pas assez de points");
      return;
    }
    setRequesting(true);
    const { error } = await supabase.from("swap_requests").insert({
      item_id: item.id,
      buyer_id: user.id,
      seller_id: item.user_id,
      points: item.points,
      message: message || null,
    });
    if (!error && message) {
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: item.user_id,
        content: `[Demande d’échange pour "${item.title}"] ${message}`,
      });
    }
    setRequesting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Demande envoyée !");
      setOpen(false);
      setMessage("");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cet objet ?")) return;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Objet supprimé");
      qc.invalidateQueries();
      navigate("/marketplace");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-muted aspect-square rounded-2xl overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground">
              <ImageOff className="h-16 w-16" />
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary-soft text-primary border-0 font-semibold">{item.points} points</Badge>
              {item.category && <Badge variant="outline">{item.category}</Badge>}
              {item.condition && <Badge variant="outline">{item.condition}</Badge>}
              {item.status !== "available" && <Badge variant="secondary">{item.status}</Badge>}
            </div>
            <h1 className="text-3xl font-bold mt-3">{item.title}</h1>
            {item.location && (
              <p className="text-muted-foreground flex items-center gap-1 mt-2">
                <MapPin className="h-4 w-4" /> {item.location}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Publié le {format(new Date(item.created_at), "d MMMM yyyy", { locale: fr })}</p>
          </div>

          {item.description && <p className="text-foreground/80 whitespace-pre-wrap">{item.description}</p>}

          <Link to={`/messages?with=${item.user_id}`} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl hover:bg-muted transition">
            <Avatar>
              {owner?.avatar_url && <AvatarImage src={owner.avatar_url} />}
              <AvatarFallback className="bg-primary text-primary-foreground">{owner?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{owner?.username ?? "Utilisateur"}</p>
              <p className="text-xs text-muted-foreground">Appuyer pour envoyer un message</p>
            </div>
          </Link>

          {isOwner ? (
            <Button variant="destructive" onClick={handleDelete} className="w-full h-11">
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer l’objet
            </Button>
          ) : item.status === "available" ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-11" disabled={!user}>
                  <Send className="h-4 w-4 mr-2" /> Demander l’échange ({item.points} pts)
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Demander l’échange</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Tu enverras au propriétaire de {item.title} une demande d’échange pour <strong>{item.points} points</strong>.
                  Il pourra accepter ou refuser.
                </p>
                <Textarea
                  placeholder="Ajouter un message (facultatif)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button onClick={handleRequest} disabled={requesting}>
                    {requesting ? "Envoi..." : "Envoyer la demande"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button disabled className="w-full h-11">Objet déjà échangé</Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { MapPin, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export interface ItemCardData {
  id: string;
  title: string;
  image_url: string | null;
  points: number;
  location: string | null;
  created_at: string;
  status?: string;
}

export function ItemCard({ item }: { item: ItemCardData }) {
  return (
    <Link
      to={`/items/${item.id}`}
      className="group bg-card rounded-2xl border overflow-hidden shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all flex flex-col"
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        {item.status && item.status !== "available" && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            {item.status}
          </Badge>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold line-clamp-1">{item.title}</h3>
        <div className="flex items-center justify-between gap-2">
          <Badge className="bg-primary-soft text-primary hover:bg-primary-soft border-0 font-semibold">
            {item.points} points
          </Badge>
          {item.location && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" /> {item.location}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{format(new Date(item.created_at), "d MMM", { locale: fr })}</p>
      </div>
    </Link>
  );
}

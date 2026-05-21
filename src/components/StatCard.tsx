import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";

type Variant = "primary" | "soft-purple" | "soft-amber";

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  linkLabel: string;
  linkTo: string;
  variant?: Variant;
}

const variantStyles: Record<Variant, { card: string; iconWrap: string; title: string; value: string; link: string }> = {
  primary: {
    card: "bg-gradient-primary text-primary-foreground border-transparent shadow-elevated",
    iconWrap: "bg-white/20 text-white",
    title: "text-white/85",
    value: "text-white",
    link: "text-white hover:text-white/90",
  },
  "soft-purple": {
    card: "bg-card border",
    iconWrap: "bg-info/15 text-info",
    title: "text-muted-foreground",
    value: "text-foreground",
    link: "text-primary hover:underline",
  },
  "soft-amber": {
    card: "bg-card border",
    iconWrap: "bg-warning/15 text-warning",
    title: "text-muted-foreground",
    value: "text-foreground",
    link: "text-primary hover:underline",
  },
};

export function StatCard({ title, value, icon: Icon, linkLabel, linkTo, variant = "soft-purple" }: StatCardProps) {
  const s = variantStyles[variant];
  return (
    <div className={`rounded-2xl p-6 shadow-card ${s.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-sm font-medium ${s.title}`}>{title}</p>
          <p className={`text-3xl font-bold mt-2 ${s.value}`}>{value}</p>
        </div>
        <div className={`h-11 w-11 shrink-0 rounded-full grid place-items-center ${s.iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <Link to={linkTo} className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${s.link}`}>
        {linkLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

import { Home, Search, Plus, MessageSquare, User as UserIcon, Bell, History, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const items = [
  { title: "Accueil", url: "/", icon: Home },
  { title: "Marché", url: "/marketplace", icon: Search },
  { title: "Ajouter un objet", url: "/add-item", icon: Plus },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Profil", url: "/profile", icon: UserIcon },
];

const secondary = [
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Historique", url: "/history", icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-primary-soft text-primary"
        : "text-foreground/70 hover:bg-muted hover:text-foreground"
    }`;

  const initials = profile?.username?.slice(0, 1).toUpperCase() ?? "U";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-5 pt-6 pb-4">
        <NavLink to="/" className="flex items-center">
          {collapsed ? (
            <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground font-bold">
              S
            </div>
          ) : (
            <span className="text-2xl font-bold text-primary tracking-tight">SwapSmart</span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={linkClass(isActive(item.url))}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-4 border-t" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {secondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={linkClass(isActive(item.url))}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 bg-primary text-primary-foreground">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.username} />}
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile?.username ?? "Utilisateur"}</p>
                <p className="text-xs text-muted-foreground">Points : {profile?.points ?? 0}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

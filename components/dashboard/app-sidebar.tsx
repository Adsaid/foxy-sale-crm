"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  ChevronsUpDown,
  LogOut,
  Phone,
  ClipboardList,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/hooks/use-logout";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FOX_LOGO_SRC } from "@/components/auth/auth-fox-logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teamService } from "@/services/team-service";
import { useActiveTeamId } from "@/hooks/use-active-team";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
}

const allNavItems: NavItem[] = [
  { title: "Статистика", href: "/dashboard", icon: BarChart3, roles: ["SALES", "DEV", "DESIGNER", "ADMIN", "SUPER_ADMIN"] },
  { title: "Акаунти", href: "/dashboard/accounts", icon: Building2, roles: ["SALES", "ADMIN", "SUPER_ADMIN"] },
  { title: "Дзвінки", href: "/dashboard/calls", icon: Phone, roles: ["SALES", "DEV", "DESIGNER", "ADMIN", "SUPER_ADMIN"] },
  { title: "Підсумки", href: "/dashboard/summary", icon: ClipboardList, roles: ["SALES", "ADMIN", "SUPER_ADMIN"] },
  { title: "Користувачі", href: "/dashboard/users", icon: Users, roles: ["ADMIN", "SUPER_ADMIN"] },
];

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Супер адміністратор",
  ADMIN: "Адміністратор",
  DEV: "Розробник",
  DESIGNER: "Дизайнер",
  SALES: "Сейл",
};

/** Невелика пауза перед закриттям шиту — видно активний пункт, плавніше виглядає. */
const MOBILE_SIDEBAR_CLOSE_DELAY_MS = 300;

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { mutate: logout } = useLogout();
  const queryClient = useQueryClient();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const role = user?.role ?? "SALES";
  const { activeTeamId, setActiveTeamId } = useActiveTeamId();
  const { data: teams = [] } = useQuery({
    queryKey: ["teams-accessible"],
    queryFn: () => teamService.listAccessible(),
    enabled: role === "SUPER_ADMIN",
  });

  useEffect(() => {
    return () => {
      if (closeMobileTimerRef.current) clearTimeout(closeMobileTimerRef.current);
    };
  }, []);

  const closeMobileSidebar = () => {
    if (!isMobile) return;
    if (closeMobileTimerRef.current) clearTimeout(closeMobileTimerRef.current);
    closeMobileTimerRef.current = setTimeout(() => {
      closeMobileTimerRef.current = null;
      setOpenMobile(false);
    }, MOBILE_SIDEBAR_CLOSE_DELAY_MS);
  };

  const items = allNavItems.filter((item) => item.roles.includes(role));

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  useEffect(() => {
    if (role !== "SUPER_ADMIN") return;
    if (!teams.length) return;
    if (!activeTeamId || !teams.some((team) => team.id === activeTeamId)) {
      setActiveTeamId(teams[0].id);
    }
  }, [activeTeamId, role, setActiveTeamId, teams]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" onClick={closeMobileSidebar}>
                <div className="relative flex size-9 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                  <Image
                    src={FOX_LOGO_SRC}
                    alt=""
                    width={36}
                    height={36}
                    className="size-full object-contain object-center"
                    priority
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Foxy Sale</span>
                  <span className="truncate text-xs">CRM</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{roleLabels[role] ?? role}</SidebarGroupLabel>
          {role === "SUPER_ADMIN" && (
            <div className="mb-3 px-2">
              <Select
                value={activeTeamId ?? ""}
                onValueChange={(value) => {
                  setActiveTeamId(value);
                  queryClient.invalidateQueries();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Оберіть команду" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.title}
                >
                  <Link href={item.href} onClick={closeMobileSidebar}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut />
                  Вийти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
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
const EASTER_EGG_CLICK_WINDOW_MS = 900;
const EASTER_EGG_INTRO_MS = 1700;

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { mutate: logout } = useLogout();
  const queryClient = useQueryClient();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoClickResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const easterEggIntroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [easterEggPhase, setEasterEggPhase] = useState<"closed" | "intro" | "open">("closed");
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
      if (logoClickResetTimerRef.current) clearTimeout(logoClickResetTimerRef.current);
      if (easterEggIntroTimerRef.current) clearTimeout(easterEggIntroTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (easterEggPhase === "closed") return;

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEasterEggPhase("closed");
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [easterEggPhase]);

  const closeMobileSidebar = () => {
    if (!isMobile) return;
    if (closeMobileTimerRef.current) clearTimeout(closeMobileTimerRef.current);
    closeMobileTimerRef.current = setTimeout(() => {
      closeMobileTimerRef.current = null;
      setOpenMobile(false);
    }, MOBILE_SIDEBAR_CLOSE_DELAY_MS);
  };

  const handleLogoEasterEggClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setLogoClickCount((prevCount) => {
      const nextCount = prevCount + 1;
      if (logoClickResetTimerRef.current) clearTimeout(logoClickResetTimerRef.current);

      if (nextCount >= 3) {
        if (easterEggIntroTimerRef.current) clearTimeout(easterEggIntroTimerRef.current);
        setEasterEggPhase("intro");
        easterEggIntroTimerRef.current = setTimeout(() => {
          setEasterEggPhase("open");
          easterEggIntroTimerRef.current = null;
        }, EASTER_EGG_INTRO_MS);
        return 0;
      }

      logoClickResetTimerRef.current = setTimeout(() => {
        setLogoClickCount(0);
      }, EASTER_EGG_CLICK_WINDOW_MS);

      return nextCount;
    });
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
                <div
                  className="relative flex size-9 shrink-0 overflow-hidden rounded-lg bg-muted/40"
                  onClick={handleLogoEasterEggClick}
                  role="button"
                  tabIndex={0}
                  aria-label="Лого Foxy Sale"
                >
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
      {easterEggPhase !== "closed" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black p-2 sm:p-4">
            <div className="easter-egg-stars" />
            <div className="easter-egg-nebula" />
            <div className={`easter-egg-portal ${easterEggPhase === "open" ? "opacity-0" : "opacity-100"}`} />
            <div className={`easter-egg-fox ${easterEggPhase === "open" ? "easter-egg-fox-open" : ""}`}>
              <Image
                src={FOX_LOGO_SRC}
                alt=""
                width={220}
                height={220}
                className="h-40 w-40 object-contain sm:h-56 sm:w-56"
                priority
              />
            </div>
            <button
              type="button"
              onClick={() => setEasterEggPhase("closed")}
              className="absolute right-4 top-4 z-20 rounded-md border border-white/30 bg-black/40 px-3 py-1 text-sm text-white backdrop-blur hover:bg-black/60"
            >
              Закрити
            </button>
            <iframe
              src="https://www.solarsystemscope.com/iframe"
              className={`relative z-10 h-full w-full rounded-md border-2 border-[#0f5c6e] transition-all duration-700 ${
                easterEggPhase === "open"
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-110 opacity-0"
              }`}
              style={{ border: "2px solid #0f5c6e" }}
              title="Solar System"
            />
            <style jsx global>{`
              .easter-egg-stars,
              .easter-egg-nebula,
              .easter-egg-portal,
              .easter-egg-fox {
                pointer-events: none;
                position: absolute;
              }
              .easter-egg-stars {
                inset: -20%;
                background-image:
                  radial-gradient(2px 2px at 20% 30%, rgba(255, 255, 255, 0.9), transparent 70%),
                  radial-gradient(1.5px 1.5px at 80% 20%, rgba(190, 230, 255, 0.9), transparent 70%),
                  radial-gradient(1.5px 1.5px at 65% 70%, rgba(255, 255, 255, 0.75), transparent 70%),
                  radial-gradient(2px 2px at 35% 85%, rgba(131, 190, 255, 0.85), transparent 70%);
                background-size: 280px 280px, 340px 340px, 220px 220px, 300px 300px;
                opacity: 0.65;
                animation: easter-stars-drift 18s linear infinite;
              }
              .easter-egg-nebula {
                inset: -25%;
                background:
                  radial-gradient(circle at 50% 45%, rgba(59, 130, 246, 0.35), transparent 35%),
                  radial-gradient(circle at 62% 58%, rgba(14, 165, 233, 0.3), transparent 30%),
                  radial-gradient(circle at 45% 62%, rgba(168, 85, 247, 0.22), transparent 34%);
                filter: blur(16px);
                animation: easter-nebula-breathe 3s ease-in-out infinite alternate;
              }
              .easter-egg-portal {
                left: 50%;
                top: 50%;
                width: min(72vw, 720px);
                height: min(72vw, 720px);
                transform: translate(-50%, -50%);
                border-radius: 9999px;
                background:
                  radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, rgba(14, 165, 233, 0.08) 35%, rgba(0, 0, 0, 0) 62%),
                  conic-gradient(from 90deg, rgba(56, 189, 248, 0.35), rgba(6, 182, 212, 0.08), rgba(125, 211, 252, 0.33), rgba(56, 189, 248, 0.35));
                filter: blur(1px);
                transition: opacity 450ms ease;
                animation: easter-portal-spin 1.4s linear infinite;
              }
              .easter-egg-fox {
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) scale(0.68);
                opacity: 0;
                z-index: 8;
                filter: drop-shadow(0 0 10px rgba(125, 211, 252, 0.75));
                animation: easter-fox-arrive 1s cubic-bezier(0.16, 1, 0.3, 1) forwards,
                  easter-fox-float 2s ease-in-out 1s infinite;
              }
              .easter-egg-fox-open {
                opacity: 0 !important;
                transform: translate(-50%, -50%) scale(1.5) !important;
                transition: all 650ms ease;
              }
              @keyframes easter-stars-drift {
                from {
                  transform: translateY(-2%) scale(1.02);
                }
                to {
                  transform: translateY(2%) scale(1.06);
                }
              }
              @keyframes easter-nebula-breathe {
                from {
                  opacity: 0.45;
                  transform: scale(1);
                }
                to {
                  opacity: 0.75;
                  transform: scale(1.08);
                }
              }
              @keyframes easter-portal-spin {
                from {
                  transform: translate(-50%, -50%) rotate(0deg);
                }
                to {
                  transform: translate(-50%, -50%) rotate(360deg);
                }
              }
              @keyframes easter-fox-arrive {
                0% {
                  opacity: 0;
                  transform: translate(-50%, -45%) scale(0.3) rotate(-22deg);
                }
                70% {
                  opacity: 1;
                  transform: translate(-50%, -50%) scale(1.05) rotate(3deg);
                }
                100% {
                  opacity: 1;
                  transform: translate(-50%, -50%) scale(0.92) rotate(0deg);
                }
              }
              @keyframes easter-fox-float {
                from {
                  margin-top: -4px;
                }
                to {
                  margin-top: 4px;
                }
              }
            `}</style>
          </div>,
          document.body
        )}
    </Sidebar>
  );
}

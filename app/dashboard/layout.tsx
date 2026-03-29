import { AppSidebar } from "@/components/dashboard/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationsBell } from "@/components/notifications/notifications-bell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-8 self-center" />
            <span className="truncate text-sm font-medium">Foxy Sale CRM</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
          </div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

import { AppSidebar } from "@/components/app-sidebar"
import { NavbarClock } from "@/components/navbar-clock"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 !h-4" />
          <span className="font-bold text-lg">TMS App Platform</span>
          <div className="ml-auto flex items-center gap-2">
            <NavbarClock />
            <ThemeToggle />
          </div>
        </header>
        <main className="bg-muted/40 flex-1 overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

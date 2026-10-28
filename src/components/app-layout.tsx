import { AppSidebar } from "@/components/app-sidebar"
import { OfflineBanner } from "@/components/offline-banner"
import { SearchProvider } from "@/components/search/search-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppLayout({ activeId, children }: { activeId: string; children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SearchProvider>
        <AppSidebar variant="inset" activeId={activeId} />
        <SidebarInset>
          <OfflineBanner />
          {children}
        </SidebarInset>
      </SearchProvider>
    </SidebarProvider>
  )
}

/** Page body below the header, with the dashboard's spacing and container queries. Fills the screen's height, so a child with flex-1 can too. */
export function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
      </div>
    </div>
  )
}

import * as React from "react"
import { DatabaseBackupIcon, DownloadIcon, SearchIcon, VaultIcon } from "lucide-react"

import { BackupDialog } from "@/components/backup-dialog"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useSearch } from "@/components/search/context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { promptInstall, useCanInstall } from "@/lib/install"
import { MODULES } from "@/modules"

export function AppSidebar({
  activeId,
  ...props
}: React.ComponentProps<typeof Sidebar> & { activeId: string }) {
  const [backupOpen, setBackupOpen] = React.useState(false)
  const search = useSearch()
  const canInstall = useCanInstall()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#/">
                <VaultIcon className="size-5!" />
                <span className="text-base font-semibold">Vault</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2 pt-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Buscar"
              onClick={() => search.setOpen(true)}
              className="border bg-background text-muted-foreground shadow-xs hover:text-foreground"
            >
              <SearchIcon />
              <span>Buscar</span>
              <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavMain
          items={MODULES.map((m) => ({
            title: m.name,
            url: `#/${m.id}`,
            icon: <m.icon />,
            isActive: m.id === activeId,
          }))}
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {canInstall && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Instalar app" onClick={() => void promptInstall()}>
                <DownloadIcon />
                <span>Instalar app</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Backup" onClick={() => setBackupOpen(true)}>
              <DatabaseBackupIcon />
              <span>Backup</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <BackupDialog open={backupOpen} onOpenChange={setBackupOpen} />
    </Sidebar>
  )
}

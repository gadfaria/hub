import * as React from "react"
import { DatabaseBackupIcon, VaultIcon } from "lucide-react"

import { BackupDialog } from "@/components/backup-dialog"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { MODULES } from "@/modules"

export function AppSidebar({
  activeId,
  ...props
}: React.ComponentProps<typeof Sidebar> & { activeId: string }) {
  const [backupOpen, setBackupOpen] = React.useState(false)

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

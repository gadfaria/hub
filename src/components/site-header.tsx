import { Fragment } from "react"
import { ChevronRightIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export interface Crumb {
  label: string
  href?: string
}

/** `title` is either the page name or a breadcrumb trail (the last crumb is the current page). */
export function SiteHeader({ title, children }: { title: string | Crumb[]; children?: React.ReactNode }) {
  const crumbs = typeof title === "string" ? [{ label: title }] : title

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="flex min-w-0 items-center gap-1.5 text-base font-medium">
          {crumbs.map((crumb, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />}
              {crumb.href ? (
                <a href={crumb.href} className="shrink-0 text-muted-foreground hover:text-foreground">
                  {crumb.label}
                </a>
              ) : (
                <span className="truncate">{crumb.label}</span>
              )}
            </Fragment>
          ))}
        </h1>
        {children && <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>}
      </div>
    </header>
  )
}

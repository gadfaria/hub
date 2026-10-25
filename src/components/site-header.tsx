import { Fragment } from "react"
import { ChevronRightIcon, EyeIcon, EyeOffIcon, SearchIcon } from "lucide-react"
import { useSearch } from "@/components/search/context"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { setValuesHidden, useValuesHidden } from "@/lib/privacy"
import { SidebarTrigger } from "@/components/ui/sidebar"

export interface Crumb {
  label: string
  href?: string
}

/** `title` is either the page name or a breadcrumb trail (the last crumb is the current page). */
export function SiteHeader({ title, children }: { title: string | Crumb[]; children?: React.ReactNode }) {
  const crumbs = typeof title === "string" ? [{ label: title }] : title
  const search = useSearch()
  const hidden = useValuesHidden()

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
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* On phones the sidebar (and its search button) is hidden, so search lives in the header. */}
          <Button variant="ghost" size="icon" className="size-8 md:hidden" onClick={() => search.setOpen(true)} aria-label="Buscar">
            <SearchIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setValuesHidden(!hidden)}
            aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
            aria-pressed={hidden}
            title={hidden ? "Mostrar valores" : "Ocultar valores"}
          >
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
          {children}
        </div>
      </div>
    </header>
  )
}

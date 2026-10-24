import { useEffect, useMemo, useState, type ReactNode } from "react"
import { SearchContext } from "./context"
import { SearchDialog } from "./search-dialog"

/** Owns the global search dialog and its Cmd+K / Ctrl+K shortcut. */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const value = useMemo(() => ({ open, setOpen }), [open])

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchDialog open={open} onOpenChange={setOpen} />
    </SearchContext.Provider>
  )
}

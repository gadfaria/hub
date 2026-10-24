import { createContext, useContext } from "react"

export interface SearchContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

export const SearchContext = createContext<SearchContextValue | null>(null)

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error("useSearch must be used inside <SearchProvider>")
  return ctx
}

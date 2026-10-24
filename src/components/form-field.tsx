import { Label } from "@/components/ui/label"

/** Label + control stacked, with an optional "(opcional)" hint. */
export function Field({
  label,
  id,
  optional,
  className,
  children,
}: {
  label: string
  id: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
    </div>
  )
}

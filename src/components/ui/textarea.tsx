import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border placeholder:text-[var(--rz-text-placeholder)] focus:border-foreground focus:outline-none aria-invalid:border-destructive bg-background flex field-sizing-content min-h-16 w-full rounded-[2px] border px-2.5 py-2 text-[13px] transition-colors duration-100 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

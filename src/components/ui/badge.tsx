import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[2px] border px-1.5 py-0.5 text-[11px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors duration-100 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--rz-badge-bg)] text-foreground [a&]:hover:bg-[var(--rz-hover)]",
        secondary:
          "border-transparent bg-muted text-muted-foreground [a&]:hover:bg-muted/80",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20 [a&]:hover:bg-destructive/20",
        outline:
          "border border-border text-foreground [a&]:hover:bg-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

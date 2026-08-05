import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-[13px] font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:opacity-85",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-85",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:border-[var(--rz-border-hover)]",
        secondary:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:border-[var(--rz-border-hover)]",
        ghost:
          "bg-transparent text-muted-foreground font-normal hover:text-foreground hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3 py-2 has-[>svg]:px-2.5",
        sm: "h-8 rounded-[2px] gap-1.5 px-2.5 text-xs has-[>svg]:px-2",
        lg: "h-10 rounded-[2px] px-5 text-[13px] has-[>svg]:px-3",
        icon: "size-9 rounded-[2px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

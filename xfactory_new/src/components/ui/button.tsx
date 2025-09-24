import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-200",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border-2 border-primary bg-card text-primary hover:bg-gradient-primary hover:text-primary-foreground transition-all duration-200",
        secondary: "bg-gradient-to-r from-muted to-card text-foreground hover:from-card hover:to-muted border border-border shadow-sm",
        ghost: "hover:bg-muted hover:text-foreground transition-all duration-200",
        link: "text-primary underline-offset-4 hover:underline",
        machinery: "bg-gradient-machinery text-primary-foreground hover:opacity-90 shadow-machinery hover:shadow-lg animate-machinery-hum",
        conveyor: "bg-gradient-conveyor text-primary-foreground hover:opacity-90 shadow-industrial",
        warning: "bg-gradient-warning text-primary-foreground hover:opacity-90 shadow-md",
        success: "bg-gradient-success text-primary-foreground hover:opacity-90 shadow-md",
        info: "bg-gradient-info text-primary-foreground hover:opacity-90 shadow-md",
        hero: "bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300",
        accent: "bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-md",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-md px-4",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
        xl: "h-14 rounded-lg px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

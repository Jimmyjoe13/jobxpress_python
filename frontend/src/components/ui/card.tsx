import * as React from "react"
import { cn } from "@/lib/utils"

type CardVariant = "default" | "gradient" | "glass" | "glow"

const cardVariants: Record<CardVariant, string> = {
  default: "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
  gradient: "flex flex-col gap-6 rounded-xl border bg-gradient-to-b from-card/80 to-background py-6 text-card-foreground shadow-sm",
  glass: "flex flex-col gap-6 rounded-xl border bg-card/60 backdrop-blur-xl py-6 text-card-foreground shadow-sm",
  glow: "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-lg shadow-primary/5",
}

interface CardProps extends React.ComponentProps<"div"> {
  variant?: CardVariant
}

function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants[variant], className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }

"use client"

import { forwardRef } from "react"
import { motion, HTMLMotionProps } from "framer-motion"

type CardVariant = "default" | "gradient" | "glass" | "glow"

interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  variant?: CardVariant
  hoverGlow?: boolean
  glowColor?: "indigo" | "purple" | "emerald" | "cyan"
  children?: React.ReactNode
}

const glowColors = {
  indigo: "group-hover:shadow-indigo-500/20 group-hover:border-indigo-500/30",
  purple: "group-hover:shadow-purple-500/20 group-hover:border-purple-500/30",
  emerald: "group-hover:shadow-emerald-500/20 group-hover:border-emerald-500/30",
  cyan: "group-hover:shadow-cyan-500/20 group-hover:border-cyan-500/30",
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = "",
      variant = "default",
      hoverGlow = false,
      glowColor = "indigo",
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: "bg-slate-800/50 border border-slate-700/50",
      gradient:
        "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50",
      glass:
        "bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/10",
      glow: "bg-slate-800/50 border border-slate-700/50 relative overflow-hidden",
    }

    const hoverGlowClass = hoverGlow
      ? `group transition-all duration-300 hover:shadow-xl ${glowColors[glowColor]}`
      : ""

    return (
      <motion.div
        ref={ref}
        className={`rounded-2xl shadow-xl ${variants[variant]} ${hoverGlowClass} ${className}`}
        whileHover={hoverGlow ? { y: -4, scale: 1.01 } : undefined}
        transition={{ type: "tween", duration: 0.2 }}
        {...props}
      >
        {/* Gradient border effect for glow variant */}
        {variant === "glow" && (
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-[-1px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-30" />
          </div>
        )}
        {children}
      </motion.div>
    )
  }
)
Card.displayName = "Card"

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`p-6 pb-4 ${className}`} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", ...props }, ref) => (
    <h3 ref={ref} className={`text-xl font-semibold text-white ${className}`} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", ...props }, ref) => (
  <p ref={ref} className={`text-sm text-slate-400 mt-1 ${className}`} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export type { CardProps }

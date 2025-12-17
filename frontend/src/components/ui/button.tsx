"use client"

import { forwardRef } from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { Loader2 } from "lucide-react"

type MotionButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gradient" | "glass"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  shine?: boolean
  children: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading,
      shine = true,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden group"

    const variants = {
      primary:
        "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40",
      secondary: "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500",
      outline:
        "border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white focus:ring-slate-500 hover:border-slate-500",
      ghost: "text-slate-400 hover:text-white hover:bg-slate-800 focus:ring-slate-500",
      gradient:
        "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 focus:ring-indigo-500",
      glass:
        "bg-white/5 backdrop-blur-lg border border-white/10 text-white hover:bg-white/10 hover:border-white/20 focus:ring-white/30",
    }

    const sizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-5 py-2.5 text-sm gap-2",
      lg: "px-8 py-3.5 text-base gap-2",
    }

    return (
      <motion.button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02, y: disabled || isLoading ? 0 : -2 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ type: "tween", duration: 0.15 }}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Chargement...</span>
          </>
        ) : (
          <>
            {/* Content with z-index to stay above shine effect */}
            <span className="relative z-10 flex items-center gap-2">{children}</span>

            {/* Shine effect overlay */}
            {shine && (variant === "gradient" || variant === "primary") && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            )}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = "Button"

export { Button }
export type { MotionButtonProps as ButtonProps }

import * as React from "react"
import { cn } from "@/lib/utils"

const inputBase = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
const inputFocus = "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

    const inputElement = (
      <input
        type={type}
        id={inputId}
        data-slot="input"
        className={cn(
          inputBase,
          inputFocus,
          icon && "pl-9",
          error && "border-destructive focus-visible:ring-destructive/20",
          !error && "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        ref={ref}
        aria-invalid={!!error}
        {...props}
      />
    )

    const wrappedInput = icon ? (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:size-4">
          {icon}
        </span>
        {inputElement}
      </div>
    ) : inputElement

    if (label || error || helperText) {
      return (
        <div className="space-y-2">
          {label && (
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-foreground"
            >
              {label}
            </label>
          )}
          {wrappedInput}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          {helperText && !error && (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          )}
        </div>
      )
    }

    return wrappedInput
  }
)
Input.displayName = "Input"

export { Input }

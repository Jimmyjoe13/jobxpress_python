"use client"

import { forwardRef } from "react"

interface SwitchProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onChange, label, description, disabled = false, className = "" }, ref) => {
    const handleClick = () => {
      if (!disabled && onChange) {
        onChange(!checked)
      }
    }

    return (
      <div className={`flex items-center justify-between ${className}`}>
        {(label || description) && (
          <div className="flex-1 mr-4">
            {label && (
              <span className="text-sm font-medium text-white">{label}</span>
            )}
            {description && (
              <p className="text-sm text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
        )}
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={handleClick}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full 
            border-2 border-transparent transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
            ${checked ? 'bg-indigo-600' : 'bg-slate-700'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full 
              bg-white shadow ring-0 transition duration-200 ease-in-out
              ${checked ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }

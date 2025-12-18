"use client"

import { useState, KeyboardEvent } from "react"
import { X, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SkillTagsProps {
  skills: string[]
  onChange: (skills: string[]) => void
  maxSkills?: number
  placeholder?: string
  disabled?: boolean
}

export function SkillTags({
  skills,
  onChange,
  maxSkills = 15,
  placeholder = "Ajouter une compétence...",
  disabled = false
}: SkillTagsProps) {
  const [inputValue, setInputValue] = useState("")

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (!trimmed) return
    if (skills.includes(trimmed)) return
    if (skills.length >= maxSkills) return
    
    onChange([...skills, trimmed])
    setInputValue("")
  }

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter(skill => skill !== skillToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && skills.length > 0) {
      removeSkill(skills[skills.length - 1])
    }
  }

  return (
    <div className="w-full">
      {/* Tags Container */}
      <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-xl min-h-[52px]">
        <AnimatePresence mode="popLayout">
          {skills.map((skill) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-medium border border-indigo-500/30"
            >
              {skill}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="p-0.5 hover:bg-indigo-500/30 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
        
        {/* Input */}
        {!disabled && skills.length < maxSkills && (
          <div className="flex items-center gap-1 flex-1 min-w-[150px]">
            <Plus className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (inputValue.trim()) {
                  addSkill(inputValue)
                }
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-white placeholder:text-slate-500 text-sm focus:outline-none"
            />
          </div>
        )}
      </div>
      
      {/* Helper Text */}
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>Appuyez sur Entrée ou virgule pour ajouter</span>
        <span>{skills.length}/{maxSkills}</span>
      </div>
    </div>
  )
}

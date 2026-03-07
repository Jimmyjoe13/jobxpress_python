"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

interface StreamingTeletypeProps {
  content: string
  speed?: number
  onComplete?: () => void
  className?: string
}

export function StreamingTeletype({ 
  content, 
  speed = 10, 
  onComplete,
  className 
}: StreamingTeletypeProps) {
  const [displayedContent, setDisplayedContent] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Si le contenu change radicalement (nouveau message), reset
    if (!content.startsWith(displayedContent)) {
      setDisplayedContent("")
      setCurrentIndex(0)
    }
  }, [content])

  useEffect(() => {
    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, speed)
      return () => clearTimeout(timeout)
    } else if (onComplete && currentIndex === content.length && content.length > 0) {
      onComplete()
    }
  }, [content, currentIndex, speed, onComplete])

  return (
    <div className={className}>
      {displayedContent}
      {currentIndex < content.length && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 align-middle"
        />
      )}
    </div>
  )
}

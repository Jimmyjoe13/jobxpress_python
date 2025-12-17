"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

interface ParticlesBackgroundProps {
  count?: number
  className?: string
  color?: "indigo" | "purple" | "cyan" | "mixed"
}

export function ParticlesBackground({
  count = 50,
  className = "",
  color = "mixed",
}: ParticlesBackgroundProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }))
  }, [count])

  const getColor = (index: number) => {
    if (color === "mixed") {
      const colors = [
        "bg-indigo-500/30",
        "bg-purple-500/30",
        "bg-cyan-500/30",
        "bg-pink-500/20",
      ]
      return colors[index % colors.length]
    }
    const colorMap = {
      indigo: "bg-indigo-500/30",
      purple: "bg-purple-500/30",
      cyan: "bg-cyan-500/30",
    }
    return colorMap[color]
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${getColor(particle.id)} blur-sm`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// Floating orbs - larger, more prominent animated elements
interface FloatingOrbsProps {
  className?: string
}

export function FloatingOrbs({ className = "" }: FloatingOrbsProps) {
  const orbs = [
    {
      size: "w-64 h-64",
      position: "top-20 -left-32",
      color: "bg-indigo-500/10",
      blur: "blur-3xl",
      duration: 8,
    },
    {
      size: "w-96 h-96",
      position: "top-40 -right-48",
      color: "bg-purple-500/10",
      blur: "blur-3xl",
      duration: 12,
    },
    {
      size: "w-72 h-72",
      position: "bottom-20 left-1/4",
      color: "bg-cyan-500/10",
      blur: "blur-3xl",
      duration: 10,
    },
    {
      size: "w-48 h-48",
      position: "bottom-40 right-1/4",
      color: "bg-pink-500/10",
      blur: "blur-2xl",
      duration: 15,
    },
  ]

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {orbs.map((orb, index) => (
        <motion.div
          key={index}
          className={`absolute rounded-full ${orb.size} ${orb.position} ${orb.color} ${orb.blur}`}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: index * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

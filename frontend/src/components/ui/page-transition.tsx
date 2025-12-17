"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import type { Variants } from "framer-motion"

interface PageTransitionProps {
  children: ReactNode
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      type: "tween",
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      type: "tween",
      ease: "easeIn",
    },
  },
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Simpler fade transition for less intrusive effect
const fadeVariants: Variants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: 0.3, type: "tween", ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, type: "tween", ease: "easeIn" },
  },
}

export function FadeTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={fadeVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Slide transition for dashboard pages
const slideVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      type: "tween",
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      type: "tween",
      ease: "easeIn",
    },
  },
}

export function SlideTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={slideVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}


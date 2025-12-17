"use client"

import Link from "next/link"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Menu, X } from "lucide-react"

const navLinks = [
  { href: "#features", label: "Fonctionnalités" },
  { href: "#how-it-works", label: "Comment ça marche" },
  { href: "/pricing", label: "Tarifs", isPage: true },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isMobileMenuOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobileMenuOpen])

  // Focus first menu item when opened
  useEffect(() => {
    if (isMobileMenuOpen && menuRef.current) {
      const firstLink = menuRef.current.querySelector("a, button") as HTMLElement
      firstLink?.focus()
    }
  }, [isMobileMenuOpen])

  const toggleMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "py-3 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 shadow-lg shadow-black/10"
          : "py-5 bg-transparent"
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group relative z-10"
            aria-label="JobXpress - Accueil"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
            >
              <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
            </motion.div>
            <span className="text-xl font-bold">
              <span className="text-white">Job</span>
              <span className="text-gradient">Xpress</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav
            className="hidden md:flex items-center gap-8 relative z-10"
            role="navigation"
            aria-label="Navigation principale"
          >
            {navLinks.map((link) =>
              link.isPage ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-sm"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full transition-all duration-300" />
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-sm"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full transition-all duration-300" />
                </a>
              )
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4 relative z-10">
            <Link
              href="/login"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium px-4 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-lg"
            >
              Connexion
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/register"
                className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <span className="relative z-10">Commencer gratuitement</span>
                {/* Shine effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            ref={menuButtonRef}
            whileTap={{ scale: 0.9 }}
            className="md:hidden p-2 text-slate-300 hover:text-white relative z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
            onClick={toggleMenu}
            aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden"
                style={{ top: "60px" }}
                onClick={closeMenu}
                aria-hidden="true"
              />
              <motion.div
                ref={menuRef}
                id="mobile-menu"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="md:hidden overflow-hidden relative z-50 bg-slate-900/95 backdrop-blur-xl rounded-b-2xl"
                role="dialog"
                aria-modal="true"
                aria-label="Menu de navigation mobile"
              >
                <nav className="flex flex-col gap-4 py-4 px-2" role="navigation">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      {link.isPage ? (
                        <Link
                          href={link.href}
                          className="text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors font-medium py-3 px-4 block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          onClick={closeMenu}
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors font-medium py-3 px-4 block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          onClick={closeMenu}
                        >
                          {link.label}
                        </a>
                      )}
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col gap-3 pt-4 mt-2 border-t border-slate-700/50"
                  >
                    <Link
                      href="/login"
                      className="text-center py-3 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      onClick={closeMenu}
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/register"
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-center font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      onClick={closeMenu}
                    >
                      Commencer gratuitement
                    </Link>
                  </motion.div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}

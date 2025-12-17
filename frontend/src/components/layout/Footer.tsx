"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

const footerLinks = [
  { href: "/privacy", label: "Confidentialité" },
  { href: "/terms", label: "Conditions" },
  { href: "/contact", label: "Contact" },
]

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-12 border-t border-slate-800 relative z-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-lg font-bold text-white">JobXpress</span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-8 text-sm text-slate-400">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-white transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-indigo-500 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} JobXpress. Tous droits réservés.
          </p>
        </div>
      </div>
    </motion.footer>
  )
}

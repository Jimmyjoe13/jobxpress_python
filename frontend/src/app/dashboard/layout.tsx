"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Sparkles, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  ChevronRight
} from "lucide-react"
import { CreditsBadge } from "@/components/ui/credits-badge"
import { NotificationsPopover } from "@/components/ui/notifications-popover"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Nouvelle candidature", href: "/dashboard/apply", icon: FileText },
  { name: "Mon profil", href: "/dashboard/profile", icon: User },
  { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userName, setUserName] = useState("Utilisateur")
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    const loadUser = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return
      }
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserName(user.user_metadata?.first_name || "Utilisateur")
          setUserEmail(user.email || "")
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:fixed inset-y-0 left-0 z-50
        w-72 
        bg-slate-900 border-r border-slate-800
        transform transition-transform duration-300 ease-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-white">Job</span>
                <span className="text-gradient">Xpress</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Menu</p>
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border-l-4 border-indigo-500 ml-0 pl-3' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : ''}`} />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail || "Plan Gratuit"}</p>
              </div>
            </div>
            {/* Credits Badge */}
            <div className="mb-4 px-2">
              <CreditsBadge showPlan className="w-full justify-center" />
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">JobXpress</span>
            </Link>
            <NotificationsPopover />
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {navigation.find(n => n.href === pathname)?.name || "Dashboard"}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <CreditsBadge />
              <NotificationsPopover />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:scale-105 transition-transform">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

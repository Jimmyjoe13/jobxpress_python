"use client"

import { useState, createContext, useContext, ReactNode } from "react"

interface TabsContextType {
  activeTab: string
  setActiveTab: (id: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

function useTabs() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider")
  }
  return context
}

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
}

function Tabs({ defaultValue, children, className = "" }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

function TabsList({ children, className = "" }: TabsListProps) {
  return (
    <div 
      className={`
        flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50
        ${className}
      `}
      role="tablist"
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

function TabsTrigger({ value, children, className = "" }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs()
  const isActive = activeTab === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={`
        flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
        ${isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
        }
        ${className}
      `}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

function TabsContent({ value, children, className = "" }: TabsContentProps) {
  const { activeTab } = useTabs()

  if (activeTab !== value) return null

  return (
    <div 
      role="tabpanel"
      className={`mt-6 animate-fade-in ${className}`}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

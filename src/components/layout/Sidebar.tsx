'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Store,
  History,
  AlertCircle,
  Pill,
  LogOut,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Produse', href: '/products', icon: Package },
  { name: 'Retaileri', href: '/retailers', icon: Store },
  { name: 'Istoric Prețuri', href: '/history', icon: History },
  { name: 'Loguri & Erori', href: '/logs', icon: AlertCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Pill className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">PharmTracker</h1>
          <p className="text-xs text-gray-500">Price Monitor</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer - Logout */}
      <div className="px-4 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Deconectare
        </button>
      </div>
    </div>
  )
}

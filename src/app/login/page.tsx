'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pill, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Eroare la autentificare')
      }
    } catch {
      setError('Eroare de conexiune')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-600 rounded-xl mb-4">
            <Pill className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PharmTracker</h1>
          <p className="text-gray-500 text-sm mt-1">Price Monitor</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
              Utilizator
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Introdu utilizatorul"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Parola
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Introdu parola"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-4 h-4" />
            {isLoading ? 'Se autentifica...' : 'Autentificare'}
          </button>
        </form>
      </div>
    </div>
  )
}

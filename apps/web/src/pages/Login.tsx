import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('testUser')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login({ username, password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-4 font-sans">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">登录 Astra AI</h1>
            <p className="text-sm text-slate-500">使用账号进入工作台。</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">用户名</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            required
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            required
          />
        </label>

        <button disabled={submitting} className="mt-6 h-10 w-full rounded-md bg-blue-600 text-sm font-medium text-white disabled:opacity-60">
          {submitting ? '登录中' : '登录'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          没有账号？
          <Link to="/register" className="text-blue-600 hover:underline">
            注册
          </Link>
        </p>
      </form>
    </main>
  )
}

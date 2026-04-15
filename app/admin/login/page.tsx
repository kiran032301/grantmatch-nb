'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.')
      return
    }

    try {
      setLoading(true)

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json?.error || 'Login failed.')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="brand">GrantMatch NB</div>

        <div className="card">
          <div className="badge">Admin Access</div>
          <h1 className="title">Admin Login</h1>
          <p className="subtitle">
            Enter your admin credentials to access the dashboard.
          </p>

          <form onSubmit={handleSubmit} className="form">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              autoComplete="username"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
            />

            {error && <div className="error">{error}</div>}

            <button type="submit" disabled={loading} className="btn">
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .page {
          min-height: 100vh;
          background: #0d1f3c;
          color: white;
          font-family: system-ui, sans-serif;
          padding: 24px 16px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wrap {
          width: 100%;
          max-width: 480px;
        }

        .brand {
          text-align: center;
          margin-bottom: 24px;
          font-size: 22px;
          font-weight: 800;
          color: #02c39a;
        }

        .card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 22px;
          padding: 28px 22px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .badge {
          display: inline-block;
          margin-bottom: 14px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(2,195,154,0.1);
          border: 1px solid rgba(2,195,154,0.25);
          color: #02c39a;
          font-size: 12px;
          font-weight: 700;
        }

        .title {
          margin: 0 0 8px;
          font-size: 42px;
          line-height: 1.1;
          font-weight: 800;
        }

        .subtitle {
          margin: 0 0 18px;
          color: rgba(255,255,255,0.65);
          font-size: 15px;
          line-height: 1.6;
        }

        .form {
          display: grid;
          gap: 12px;
        }

        .input {
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: white;
          font-size: 15px;
          outline: none;
        }

        .input:focus {
          border-color: #02c39a;
          background: rgba(255,255,255,0.07);
        }

        .btn {
          margin-top: 6px;
          padding: 14px 16px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(90deg, #028090, #02c39a);
          color: white;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error {
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.35);
          color: #fecaca;
          font-size: 14px;
        }
      `}</style>
    </main>
  )
}
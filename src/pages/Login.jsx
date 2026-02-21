import React, { useState } from 'react'

export default function Login({ onLogin, API }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const r = await fetch(`${API}/auth.php?action=login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json())
    setLoading(false)
    if (r.ok) onLogin(r.data)
    else setError(r.error)
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h1 style={s.title}>⏱ TidRapport</h1>
        <p style={s.sub}>Logga in med ditt konto</p>
        <form onSubmit={submit} style={s.form}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="din@email.se" autoComplete="email" required />
          <label style={s.label}>Lösenord</label>
          <input style={s.input} type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••" autoComplete="current-password" required />
          {error && <div style={s.error}>{error}</div>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const C = { bg: '#0f172a', card: '#1e293b', accent: '#3b82f6', text: '#f1f5f9', muted: '#94a3b8', border: '#334155', err: '#ef4444' }
const s = {
  wrap: { minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { background: C.card, borderRadius: 16, padding: 32, width: '100%', maxWidth: 380, border: `1px solid ${C.border}` },
  title: { color: C.text, fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 },
  sub: { color: C.muted, textAlign: 'center', marginBottom: 24, fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { color: C.muted, fontSize: 13, fontWeight: 500 },
  input: { background: '#0f172a', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 16, outline: 'none', width: '100%' },
  btn: { background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginTop: 8 },
  error: { background: '#7f1d1d', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 14 },
}

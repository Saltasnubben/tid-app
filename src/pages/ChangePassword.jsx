import React, { useState } from 'react'

export default function ChangePassword({ API, onClose }) {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPass !== newPass2) { setError('Lösenorden matchar inte'); return }
    if (newPass.length < 6) { setError('Minst 6 tecken'); return }

    setLoading(true)
    const r = await fetch(`${API}/auth.php?action=change_password`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, new_pass: newPass })
    }).then(r => r.json())
    setLoading(false)

    if (r.ok) setSuccess(true)
    else setError(r.error)
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>🔑 Byt lösenord</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        {success ? (
          <div style={s.successMsg}>
            ✅ Lösenordet är bytt!
            <button style={s.doneBtn} onClick={onClose}>Stäng</button>
          </div>
        ) : (
          <form onSubmit={submit} style={s.form}>
            <label style={s.lbl}>Nuvarande lösenord</label>
            <input style={s.inp} type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus />
            <label style={s.lbl}>Nytt lösenord</label>
            <input style={s.inp} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required placeholder="Minst 6 tecken" />
            <label style={s.lbl}>Bekräfta nytt lösenord</label>
            <input style={s.inp} type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} required />
            {error && <div style={s.err}>{error}</div>}
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Sparar...' : 'Byt lösenord'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const C = { card: '#1e293b', border: '#334155', text: '#f1f5f9', muted: '#94a3b8', accent: '#3b82f6' }
const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal: { background: C.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, border: `1px solid ${C.border}` },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontWeight: 700, fontSize: 18, color: C.text },
  close: { background: 'none', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer', padding: 4 },
  form: { display: 'flex', flexDirection: 'column', gap: 8 },
  lbl: { fontSize: 13, color: C.muted, fontWeight: 500 },
  inp: { background: '#0f172a', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 16, outline: 'none', width: '100%' },
  btn: { background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 },
  err: { background: '#7f1d1d', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 14 },
  successMsg: { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0', color: '#22c55e', fontSize: 16, fontWeight: 600 },
  doneBtn: { background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' },
}

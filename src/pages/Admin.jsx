import React, { useState, useEffect } from 'react'

const MONTHS = ['','Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']

export default function Admin({ API }) {
  const now = new Date()
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [sendTo, setSendTo] = useState('admin')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`${API}/admin.php?action=users`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => {
        if (r.ok) {
          setUsers(r.data)
          setSelectedIds(r.data.map(u => u.id)) // all selected by default
        }
      })
  }, [API])

  const toggleUser = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === users.length ? [] : users.map(u => u.id))
  }

  const sendReports = async () => {
    if (selectedIds.length === 0) { setMsg('⚠️ Välj minst en användare'); return }
    setSending(true); setMsg('')
    const r = await fetch(`${API}/admin.php?action=send_reports`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, user_ids: selectedIds, send_to: sendTo })
    }).then(r => r.json())
    setSending(false)
    if (r.ok) {
      const dest = sendTo === 'admin' ? 'din inkorg' : `${r.data.sent} användare`
      setMsg(`✅ Rapport för ${r.data.month_name} skickad till ${dest}`)
    } else setMsg('❌ ' + r.error)
  }

  const allSelected = selectedIds.length === users.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* User selection */}
      <div style={s.card}>
        <div style={s.cardTitle}>👥 Välj användare</div>
        <button style={s.selectAll} onClick={toggleAll}>
          {allSelected ? 'Avmarkera alla' : 'Markera alla'}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map(u => (
            <label key={u.id} style={s.userRow}>
              <input
                type="checkbox"
                checked={selectedIds.includes(u.id)}
                onChange={() => toggleUser(u.id)}
                style={s.checkbox}
              />
              <div style={{ flex: 1 }}>
                <div style={s.userName}>{u.name}</div>
                <div style={s.userEmail}>{u.email}</div>
              </div>
              {u.is_admin && <span style={s.adminBadge}>Admin</span>}
            </label>
          ))}
        </div>
      </div>

      {/* Period + send-to */}
      <div style={s.card}>
        <div style={s.cardTitle}>📧 Skicka månadsrapport</div>

        <div style={s.row2}>
          <div>
            <div style={s.lbl}>Månad</div>
            <select style={s.sel} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                <option key={m} value={m}>{MONTHS[m]}</option>
              )}
            </select>
          </div>
          <div>
            <div style={s.lbl}>År</div>
            <select style={s.sel} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[now.getFullYear() - 1, now.getFullYear()].map(y =>
                <option key={y} value={y}>{y}</option>
              )}
            </select>
          </div>
        </div>

        <div style={s.lbl}>Skicka till</div>
        <div style={s.toggleRow}>
          <button
            style={sendTo === 'admin' ? s.toggleActive : s.toggleBtn}
            onClick={() => setSendTo('admin')}
          >
            📥 Mig (samlad)
          </button>
          <button
            style={sendTo === 'users' ? s.toggleActive : s.toggleBtn}
            onClick={() => setSendTo('users')}
          >
            📨 Varje användare
          </button>
        </div>

        {sendTo === 'admin' && (
          <div style={s.hint}>
            Alla valda användares rapporter samlas i ett mail till dig.
          </div>
        )}

        <button
          style={{ ...s.sendBtn, opacity: selectedIds.length === 0 ? 0.5 : 1 }}
          onClick={sendReports}
          disabled={sending}
        >
          {sending
            ? 'Skickar...'
            : `Skicka rapport — ${MONTHS[month]} ${year} (${selectedIds.length} st)`}
        </button>

        {msg && <div style={s.msg}>{msg}</div>}
      </div>

    </div>
  )
}

const C = { card: '#1e293b', border: '#334155', text: '#f1f5f9', muted: '#94a3b8', accent: '#3b82f6' }
const s = {
  card: { background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12 },
  cardTitle: { fontWeight: 700, fontSize: 16, color: C.text },
  selectAll: { background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, alignSelf: 'flex-start' },
  userRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, cursor: 'pointer', background: '#0f172a' },
  checkbox: { width: 18, height: 18, accentColor: C.accent, cursor: 'pointer', flexShrink: 0 },
  userName: { fontWeight: 500, color: C.text, fontSize: 15 },
  userEmail: { fontSize: 12, color: C.muted },
  adminBadge: { background: '#1d4ed8', color: '#bfdbfe', fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600, flexShrink: 0 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  lbl: { fontSize: 12, color: C.muted, marginBottom: 4 },
  sel: { background: '#0f172a', border: `1px solid ${C.border}`, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 15, width: '100%' },
  toggleRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  toggleBtn: { background: '#0f172a', border: `1px solid ${C.border}`, color: C.muted, padding: 12, borderRadius: 10, cursor: 'pointer', fontSize: 14 },
  toggleActive: { background: C.accent, border: 'none', color: '#fff', padding: 12, borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  hint: { background: '#0f172a', borderRadius: 8, padding: '8px 12px', color: C.muted, fontSize: 13 },
  sendBtn: { background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  msg: { background: '#0f172a', borderRadius: 8, padding: '10px 12px', color: C.muted, fontSize: 14 },
}

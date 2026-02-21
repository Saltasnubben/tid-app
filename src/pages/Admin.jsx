import React, { useState, useEffect } from 'react'

const MONTHS = ['','Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']

export default function Admin({ API }) {
  const now = new Date()
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)
  const [userData, setUserData] = useState(null)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`${API}/admin.php?action=users`, { credentials: 'include' })
      .then(r=>r.json()).then(r=>{ if(r.ok) setUsers(r.data) })
  }, [API])

  const loadUserMonth = (uid) => {
    setSelectedUser(uid)
    fetch(`${API}/admin.php?action=user_month&user_id=${uid}&year=${year}&month=${month}`, { credentials:'include' })
      .then(r=>r.json()).then(r=>{ if(r.ok) setUserData(r.data) })
  }

  const sendReports = async () => {
    setSending(true); setMsg('')
    const r = await fetch(`${API}/admin.php?action=send_reports`, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({year, month})
    }).then(r=>r.json())
    setSending(false)
    if(r.ok) setMsg(`✅ Skickade till ${r.data.sent} av ${r.data.total} användare`)
    else setMsg('❌ Fel: ' + r.error)
  }

  const selUser = users.find(u=>u.id===selectedUser)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={s.card}>
        <div style={s.cardTitle}>👥 Användare ({users.length})</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {users.map(u=>(
            <div key={u.id} style={{...s.userRow, background: selectedUser===u.id?'#1d3a6b':'#0f172a'}}
              onClick={()=>loadUserMonth(u.id)}>
              <div>
                <div style={s.userName}>{u.name}</div>
                <div style={s.userEmail}>{u.email}</div>
              </div>
              {u.is_admin && <span style={s.adminBadge}>Admin</span>}
            </div>
          ))}
        </div>
      </div>

      {selectedUser && userData && (
        <div style={s.card}>
          <div style={s.cardTitle}>📊 {selUser?.name} — {MONTHS[month]} {year}</div>
          <div style={s.stats3}>
            <div style={s.stat}><div style={s.sv}>{userData.worked}h</div><div style={s.sl}>Arbetat</div></div>
            <div style={s.sdiv}/>
            <div style={s.stat}><div style={s.sv}>{userData.schema}h</div><div style={s.sl}>Schema</div></div>
            <div style={s.sdiv}/>
            <div style={s.stat}><div style={{...s.sv, color:userData.overtime>=0?'#22c55e':'#ef4444'}}>{userData.overtime>=0?'+':''}{userData.overtime}h</div><div style={s.sl}>Övertid</div></div>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>📧 Skicka månadsrapporter</div>
        <div style={s.row2}>
          <select style={s.sel} value={month} onChange={e=>setMonth(Number(e.target.value))}>
            {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{MONTHS[m]}</option>)}
          </select>
          <select style={s.sel} value={year} onChange={e=>setYear(Number(e.target.value))}>
            {[now.getFullYear()-1, now.getFullYear()].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button style={s.sendBtn} onClick={sendReports} disabled={sending}>
          {sending ? 'Skickar...' : `📨 Skicka till alla (${users.length} st)`}
        </button>
        {msg && <div style={s.msg}>{msg}</div>}
      </div>
    </div>
  )
}

const C = { card:'#1e293b', border:'#334155', text:'#f1f5f9', muted:'#94a3b8', accent:'#3b82f6' }
const s = {
  card: { background:C.card, borderRadius:14, padding:16, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:12 },
  cardTitle: { fontWeight:700, fontSize:16, color:C.text },
  userRow: { padding:'10px 14px', borderRadius:10, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', border:`1px solid ${C.border}` },
  userName: { fontWeight:500, color:C.text },
  userEmail: { fontSize:12, color:C.muted },
  adminBadge: { background:'#1d4ed8', color:'#bfdbfe', fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600 },
  stats3: { display:'flex', justifyContent:'space-around', alignItems:'center' },
  stat: { textAlign:'center' },
  sv: { fontSize:20, fontWeight:700, color:C.text },
  sl: { fontSize:12, color:C.muted },
  sdiv: { width:1, height:36, background:C.border },
  row2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 },
  sel: { background:'#0f172a', border:`1px solid ${C.border}`, color:C.text, padding:'10px 12px', borderRadius:10, fontSize:15 },
  sendBtn: { background:C.accent, color:'#fff', border:'none', borderRadius:10, padding:14, fontWeight:700, fontSize:15, cursor:'pointer' },
  msg: { background:'#0f172a', borderRadius:8, padding:'10px 12px', color:C.muted, fontSize:14 },
}

import React, { useState, useEffect, useRef } from 'react'

const MONTHS = ['','Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']
const EMPTY_USER = { name: '', email: '', password: '', admin: false }

export default function Admin({ API }) {
  const now = new Date()
  const [tab, setTab] = useState('users')

  // -- Users tab --
  const [jsonUsers, setJsonUsers]   = useState([])
  const [newUser,   setNewUser]     = useState(EMPTY_USER)
  const [saveMsg,   setSaveMsg]     = useState('')
  const [saving,    setSaving]      = useState(false)

  // -- Reports tab --
  const [dbUsers,     setDbUsers]     = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [sendTo,    setSendTo]    = useState('admin')
  const [sending,   setSending]   = useState(false)
  const [reportMsg, setReportMsg] = useState('')

  // -- Import tab --
  const [impUserId,  setImpUserId]  = useState('')
  const [impYear,    setImpYear]    = useState(now.getFullYear())
  const [impMonth,   setImpMonth]   = useState(now.getMonth() > 0 ? now.getMonth() : 12)
  const [impFile,    setImpFile]    = useState(null)
  const [importing,  setImporting]  = useState(false)
  const [impMsg,     setImpMsg]     = useState('')
  const fileRef = useRef()

  useEffect(() => {
    fetch(`${API}/admin.php?action=get_users_json`, { credentials: 'include' })
      .then(r => r.json()).then(r => { if (r.ok) setJsonUsers(r.data) })
    fetch(`${API}/admin.php?action=users`, { credentials: 'include' })
      .then(r => r.json()).then(r => {
        if (r.ok) { setDbUsers(r.data); setSelectedIds(r.data.map(u => u.id)) }
      })
  }, [API])

  // ── Users tab ─────────────────────────────────────
  const addUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) { setSaveMsg('⚠️ Namn, email och lösenord krävs'); return }
    if (jsonUsers.find(u => u.email === newUser.email)) { setSaveMsg('⚠️ Email finns redan'); return }
    setJsonUsers(prev => [...prev, { ...newUser }])
    setNewUser(EMPTY_USER); setSaveMsg('')
  }
  const removeUser = email => { setJsonUsers(prev => prev.filter(u => u.email !== email)); setSaveMsg('') }
  const saveUsers = async () => {
    setSaving(true); setSaveMsg('')
    const r = await fetch(`${API}/admin.php?action=save_users_json`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: jsonUsers })
    }).then(r => r.json())
    setSaving(false)
    setSaveMsg(r.ok ? `✅ Sparat! ${r.data.count} användare.` : '❌ ' + r.error)
  }

  // ── Reports tab ────────────────────────────────────
  const toggleUser = id => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const toggleAll  = () => setSelectedIds(selectedIds.length === dbUsers.length ? [] : dbUsers.map(u => u.id))
  const sendReports = async () => {
    if (!selectedIds.length) { setReportMsg('⚠️ Välj minst en användare'); return }
    setSending(true); setReportMsg('')
    const r = await fetch(`${API}/admin.php?action=send_reports`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, user_ids: selectedIds, send_to: sendTo })
    }).then(r => r.json())
    setSending(false)
    setReportMsg(r.ok
      ? `✅ Rapport för ${r.data.month_name} skickad till ${sendTo === 'admin' ? 'din inkorg' : `${r.data.sent} användare`}`
      : '❌ ' + r.error)
  }

  // ── Import tab ─────────────────────────────────────
  const downloadTemplate = () => {
    if (!impUserId) { setImpMsg('⚠️ Välj en användare'); return }
    setImpMsg('')
    fetch(`${API}/admin.php?action=csv_template`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: Number(impUserId), year: impYear, month: impMonth })
    }).then(async r => {
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      const cd = r.headers.get('Content-Disposition') || ''
      const m  = cd.match(/filename="([^"]+)"/)
      a.download = m ? m[1] : 'tidrapport.csv'
      a.click(); URL.revokeObjectURL(url)
    })
  }

  const doImport = async () => {
    if (!impUserId) { setImpMsg('⚠️ Välj en användare'); return }
    if (!impFile)   { setImpMsg('⚠️ Välj en CSV-fil'); return }
    setImporting(true); setImpMsg('')
    const fd = new FormData()
    fd.append('user_id', impUserId)
    fd.append('file', impFile)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    let r
    try {
      r = await fetch(`${API}/admin.php?action=import_csv`, {
        method: 'POST', credentials: 'include', body: fd, signal: controller.signal
      }).then(r => r.json())
    } catch (e) {
      clearTimeout(timeout)
      setImporting(false)
      setImpMsg('❌ Timeout — försök med en mindre fil eller logga ut och in igen')
      return
    }
    clearTimeout(timeout)
    setImporting(false)
    if (r.ok) {
      const d = r.data
      setImpMsg(`✅ Importerade ${d.inserted} rader${d.skipped ? ` (${d.skipped} hoppades över)` : ''}`)
      setImpFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } else {
      setImpMsg('❌ ' + r.error)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Tab bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        <button style={tab==='users'  ? s.tabActive : s.tab} onClick={() => setTab('users')}>👥 Användare</button>
        <button style={tab==='reports'? s.tabActive : s.tab} onClick={() => setTab('reports')}>📧 Rapporter</button>
        <button style={tab==='import' ? s.tabActive : s.tab} onClick={() => setTab('import')}>📥 Importera</button>
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
          <div style={s.card}>
            <div style={s.cardTitle}>Befintliga användare ({jsonUsers.length})</div>
            {jsonUsers.length === 0 && <div style={s.hint}>Inga användare ännu.</div>}
            {jsonUsers.map(u => (
              <div key={u.email} style={s.userRow}>
                <div style={{ flex: 1 }}>
                  <div style={s.userName}>{u.name} {u.admin && <span style={s.badge}>Admin</span>}</div>
                  <div style={s.userSub}>{u.email} · lösenord: {u.password}</div>
                </div>
                <button style={s.deleteBtn} onClick={() => removeUser(u.email)}>✕</button>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Lägg till användare</div>
            <div style={s.field}>
              <label style={s.lbl}>Namn</label>
              <input style={s.inp} type="text" value={newUser.name} onChange={e => setNewUser(u => ({...u, name: e.target.value}))} placeholder="Anna Andersson"/>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Email</label>
              <input style={s.inp} type="email" value={newUser.email} onChange={e => setNewUser(u => ({...u, email: e.target.value}))} placeholder="anna@foretag.se"/>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Lösenord</label>
              <input style={s.inp} type="text" value={newUser.password} onChange={e => setNewUser(u => ({...u, password: e.target.value}))} placeholder="Välkommen123"/>
            </div>
            <label style={s.checkRow}>
              <input type="checkbox" checked={newUser.admin} onChange={e => setNewUser(u => ({...u, admin: e.target.checked}))} style={{accentColor:'#3b82f6'}}/>
              <span style={s.lbl}>Admin-behörighet</span>
            </label>
            <button style={s.addBtn} onClick={addUser}>+ Lägg till</button>
          </div>

          {saveMsg && <div style={s.msg}>{saveMsg}</div>}
          <button style={s.saveBtn} onClick={saveUsers} disabled={saving}>
            {saving ? 'Sparar...' : '💾 Spara ändringar'}
          </button>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
          <div style={s.card}>
            <div style={s.cardTitle}>Välj användare</div>
            <button style={s.selectAll} onClick={toggleAll}>
              {selectedIds.length === dbUsers.length ? 'Avmarkera alla' : 'Markera alla'}
            </button>
            {dbUsers.map(u => (
              <label key={u.id} style={s.userRow}>
                <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleUser(u.id)} style={{accentColor:'#3b82f6', flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={s.userName}>{u.name}</div>
                  <div style={s.userSub}>{u.email}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Period & mottagare</div>
            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.lbl}>Månad</label>
                <select style={s.sel} value={month} onChange={e => setMonth(Number(e.target.value))}>
                  {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{MONTHS[m]}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.lbl}>År</label>
                <select style={s.sel} value={year} onChange={e => setYear(Number(e.target.value))}>
                  {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div style={s.toggleRow}>
              <button style={sendTo==='admin' ? s.toggleActive : s.toggleBtn} onClick={() => setSendTo('admin')}>📥 Till mig (samlad)</button>
              <button style={sendTo==='users' ? s.toggleActive : s.toggleBtn} onClick={() => setSendTo('users')}>📨 Till varje användare</button>
            </div>
            {reportMsg && <div style={s.msg}>{reportMsg}</div>}
            <button style={{...s.saveBtn, opacity: selectedIds.length===0 ? 0.5 : 1}} onClick={sendReports} disabled={sending}>
              {sending ? 'Skickar...' : `Skicka — ${MONTHS[month]} ${year} (${selectedIds.length} st)`}
            </button>
          </div>
        </div>
      )}

      {/* ── IMPORT TAB ── */}
      {tab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
          <div style={s.card}>
            <div style={s.cardTitle}>Steg 1 — Ladda ned mall</div>
            <div style={s.hint}>Välj användare och månad, ladda ned CSV-mallen, fyll i tider i Excel och spara som CSV.</div>

            <div style={s.field}>
              <label style={s.lbl}>Användare</label>
              <select style={s.sel} value={impUserId} onChange={e => { setImpUserId(e.target.value); setImpMsg('') }}>
                <option value="">— Välj användare —</option>
                {dbUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.lbl}>Månad</label>
                <select style={s.sel} value={impMonth} onChange={e => setImpMonth(Number(e.target.value))}>
                  {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{MONTHS[m]}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.lbl}>År</label>
                <select style={s.sel} value={impYear} onChange={e => setImpYear(Number(e.target.value))}>
                  {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <button style={s.templateBtn} onClick={downloadTemplate}>
              ⬇️ Ladda ned CSV-mall — {MONTHS[impMonth]} {impYear}
            </button>
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Steg 2 — Ladda upp ifylld CSV</div>
            <label style={s.uploadArea}>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{display:'none'}}
                onChange={e => { setImpFile(e.target.files[0]); setImpMsg('') }}/>
              {impFile
                ? <span style={{color:'#86efac', fontSize:14}}>📄 {impFile.name}</span>
                : <span style={{color:C.muted, fontSize:14}}>Tryck här för att välja CSV-fil</span>}
            </label>
            {impMsg && <div style={s.msg}>{impMsg}</div>}
            <button style={{...s.saveBtn, opacity: importing ? 0.5 : 1}} onClick={doImport} disabled={importing}>
              {importing ? 'Importerar...' : '📥 Importera'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

const C = { card:'#1e293b', border:'#334155', text:'#f1f5f9', muted:'#94a3b8', accent:'#3b82f6', bg:'#0f172a' }
const s = {
  tab:        { background:C.bg, border:`1px solid ${C.border}`, color:C.muted, padding:'10px 0', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500 },
  tabActive:  { background:C.accent, border:'none', color:'#fff', padding:'10px 0', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 },
  card:       { background:C.card, borderRadius:14, padding:16, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:10 },
  cardTitle:  { fontWeight:700, fontSize:15, color:C.text },
  hint:       { color:C.muted, fontSize:13 },
  userRow:    { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, cursor:'pointer' },
  userName:   { fontWeight:500, color:C.text, fontSize:14 },
  userSub:    { fontSize:12, color:C.muted, marginTop:2 },
  badge:      { background:'#1d4ed8', color:'#bfdbfe', fontSize:10, padding:'1px 6px', borderRadius:5, fontWeight:600, marginLeft:6 },
  deleteBtn:  { background:'#7f1d1d', color:'#fca5a5', border:'none', borderRadius:7, width:28, height:28, cursor:'pointer', fontSize:14, flexShrink:0 },
  field:      { display:'flex', flexDirection:'column', gap:4 },
  lbl:        { fontSize:12, color:C.muted },
  inp:        { background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', color:C.text, fontSize:15, outline:'none' },
  checkRow:   { display:'flex', alignItems:'center', gap:8, cursor:'pointer' },
  addBtn:     { background:'#166534', color:'#bbf7d0', border:'none', borderRadius:10, padding:12, fontWeight:600, cursor:'pointer', fontSize:14 },
  saveBtn:    { background:C.accent, color:'#fff', border:'none', borderRadius:10, padding:14, fontWeight:700, fontSize:15, cursor:'pointer' },
  templateBtn:{ background:'#1e3a5f', color:'#93c5fd', border:`1px solid #3b82f6`, borderRadius:10, padding:12, fontWeight:600, cursor:'pointer', fontSize:14 },
  uploadArea: { display:'flex', alignItems:'center', justifyContent:'center', padding:20, border:`2px dashed ${C.border}`, borderRadius:10, cursor:'pointer', minHeight:64 },
  msg:        { background:C.bg, borderRadius:8, padding:'10px 12px', color:C.text, fontSize:14 },
  selectAll:  { background:'none', border:`1px solid ${C.border}`, color:C.muted, padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:13, alignSelf:'flex-start' },
  row2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  sel:        { background:C.bg, border:`1px solid ${C.border}`, color:C.text, padding:'10px 12px', borderRadius:10, fontSize:15, width:'100%' },
  toggleRow:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 },
  toggleBtn:  { background:C.bg, border:`1px solid ${C.border}`, color:C.muted, padding:12, borderRadius:10, cursor:'pointer', fontSize:13 },
  toggleActive:{ background:C.accent, border:'none', color:'#fff', padding:12, borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600 },
}

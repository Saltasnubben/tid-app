import React, { useState, useEffect } from 'react'
import Login from './pages/Login.jsx'
import Timesheet from './pages/Timesheet.jsx'
import Summary from './pages/Summary.jsx'
import Admin from './pages/Admin.jsx'
import ChangePassword from './pages/ChangePassword.jsx'

const API = '/tid/api'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('timesheet')
  const [showPwModal, setShowPwModal] = useState(false)

  useEffect(() => {
    fetch(`${API}/auth.php?action=me`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => { if (r.ok) setUser(r.data) })
      .finally(() => setLoading(false))
  }, [])

  const logout = () => {
    fetch(`${API}/auth.php?action=logout`, { credentials: 'include' })
      .then(() => setUser(null))
  }

  if (loading) return <div style={styles.center}><div style={styles.spinner}/></div>
  if (!user) return <Login onLogin={setUser} API={API} />

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span style={styles.logo}>⏱ TidRapport</span>
        <nav style={styles.nav}>
          <button style={page==='timesheet'?styles.navActive:styles.navBtn} onClick={()=>setPage('timesheet')}>Månad</button>
          <button style={page==='summary'?styles.navActive:styles.navBtn} onClick={()=>setPage('summary')}>År</button>
          {user.is_admin && <button style={page==='admin'?{...styles.navActive,fontSize:18,padding:'4px 10px'}:{...styles.navBtn,fontSize:18,padding:'4px 10px'}} onClick={()=>setPage('admin')}>⚙️</button>}
        </nav>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={styles.logout} onClick={() => setShowPwModal(true)}>🔑</button>
          <button style={styles.logout} onClick={logout}>Logga ut</button>
        </div>
      </header>

      <main style={styles.main}>
        {page === 'timesheet' && <Timesheet API={API} user={user} />}
        {page === 'summary'   && <Summary   API={API} />}
        {page === 'admin'     && <Admin     API={API} />}
      </main>

      {showPwModal && <ChangePassword API={API} onClose={() => setShowPwModal(false)} />}
    </div>
  )
}

const C = { bg: '#0f172a', card: '#1e293b', accent: '#3b82f6', text: '#f1f5f9', muted: '#94a3b8', border: '#334155' }

const styles = {
  app: { minHeight: '100vh', background: C.bg, color: C.text },
  header: { background: C.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100 },
  logo: { fontWeight: 700, fontSize: 18, flex: 1 },
  nav: { display: 'flex', gap: 4 },
  navBtn: { background: 'none', border: 'none', color: C.muted, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  navActive: { background: C.accent, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  logout: { background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  main: { padding: '16px', maxWidth: 600, margin: '0 auto' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: C.bg },
  spinner: { width: 32, height: 32, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite' },
}

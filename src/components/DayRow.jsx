import React, { useState, useEffect } from 'react'

const DAYS = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör']
const MONTHS_SHORT = ['','Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']

export default function DayRow({ date, entry, saving, onSave }) {
  const d = new Date(date + 'T12:00:00')
  const dow = d.getDay()
  const isWeekend = dow === 0 || dow === 6
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    p1_start: '', p1_slut: '', p1_rast: '',
    p2_start: '', p2_slut: '', p2_rast: '',
    anteckning: ''
  })

  useEffect(() => {
    setForm({
      p1_start: entry.p1_start || '',
      p1_slut:  entry.p1_slut  || '',
      p1_rast:  entry.p1_rast  != null ? String(entry.p1_rast) : '',
      p2_start: entry.p2_start || '',
      p2_slut:  entry.p2_slut  || '',
      p2_rast:  entry.p2_rast  != null ? String(entry.p2_rast) : '',
      anteckning: entry.anteckning || ''
    })
  }, [entry])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSave = () => {
    onSave({
      p1_start: form.p1_start || null,
      p1_slut:  form.p1_slut  || null,
      p1_rast:  parseInt(form.p1_rast) || 0,
      p2_start: form.p2_start || null,
      p2_slut:  form.p2_slut  || null,
      p2_rast:  parseInt(form.p2_rast) || 0,
      anteckning: form.anteckning || null,
    })
    setExpanded(false)
  }

  const hours = entry.timmar || 0
  const hasData = hours > 0

  return (
    <div style={{...s.row, background: isWeekend ? '#1a2744' : '#1e293b', opacity: isWeekend ? 0.7 : 1}}>
      <div style={s.header} onClick={() => setExpanded(e => !e)}>
        <div style={s.dateBlock}>
          <div style={{...s.dow, color: isWeekend ? '#64748b' : '#94a3b8'}}>{DAYS[dow]}</div>
          <div style={s.dayNum}>{d.getDate()} {MONTHS_SHORT[d.getMonth()+1]}</div>
        </div>
        <div style={s.middle}>
          {hasData && <div style={s.timeRange}>{entry.p1_start} – {entry.p1_slut}</div>}
          {entry.anteckning && <div style={s.note} title={entry.anteckning}>{entry.anteckning}</div>}
        </div>
        <div style={s.right}>
          {hasData && <div style={s.hours}>{hours}h</div>}
          <div style={{...s.chevron, transform: expanded ? 'rotate(180deg)':'rotate(0deg)'}}>⌄</div>
        </div>
      </div>

      {expanded && (
        <div style={s.form}>
          <div style={s.passLabel}>Pass 1</div>
          <div style={s.row3}>
            <div style={s.field}><label style={s.lbl}>Start</label><input style={s.inp} type="time" value={form.p1_start} onChange={e=>set('p1_start',e.target.value)}/></div>
            <div style={s.field}><label style={s.lbl}>Slut</label><input style={s.inp} type="time" value={form.p1_slut} onChange={e=>set('p1_slut',e.target.value)}/></div>
            <div style={s.field}><label style={s.lbl}>Rast (min)</label><input style={s.inp} type="number" min="0" value={form.p1_rast} onChange={e=>set('p1_rast',e.target.value)} placeholder="0"/></div>
          </div>

          <div style={s.passLabel}>Pass 2 (valfritt)</div>
          <div style={s.row3}>
            <div style={s.field}><label style={s.lbl}>Start</label><input style={s.inp} type="time" value={form.p2_start} onChange={e=>set('p2_start',e.target.value)}/></div>
            <div style={s.field}><label style={s.lbl}>Slut</label><input style={s.inp} type="time" value={form.p2_slut} onChange={e=>set('p2_slut',e.target.value)}/></div>
            <div style={s.field}><label style={s.lbl}>Rast (min)</label><input style={s.inp} type="number" min="0" value={form.p2_rast} onChange={e=>set('p2_rast',e.target.value)} placeholder="0"/></div>
          </div>

          <div style={s.field}>
            <label style={s.lbl}>Anteckning</label>
            <input style={s.inp} type="text" value={form.anteckning} onChange={e=>set('anteckning',e.target.value)} placeholder="Vad har du gjort idag?"/>
          </div>

          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      )}
    </div>
  )
}

const s = {
  row: { borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', gap: 12 },
  dateBlock: { width: 60, flexShrink: 0 },
  dow: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  dayNum: { fontSize: 16, fontWeight: 600, color: '#f1f5f9' },
  middle: { flex: 1, minWidth: 0 },
  timeRange: { fontSize: 14, color: '#f1f5f9' },
  note: { fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  hours: { fontWeight: 700, color: '#3b82f6', fontSize: 16 },
  chevron: { color: '#64748b', fontSize: 18, transition: 'transform 0.2s', lineHeight: 1 },
  form: { padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #334155', paddingTop: 14 },
  passLabel: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  lbl: { fontSize: 11, color: '#64748b' },
  inp: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 15, width: '100%', outline: 'none' },
  saveBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 },
}

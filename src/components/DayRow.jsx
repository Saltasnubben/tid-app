import React, { useState, useEffect, useRef } from 'react'

const DAYS = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör']
const MONTHS_SHORT = ['','Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
const TODAY = new Date().toISOString().split('T')[0]
const RAST_OPTIONS = [0, 15, 30, 45, 60, 90]

const DAY_TYPES = [
  { value: 'work',     label: 'Arbetsdag', emoji: null,  bg: null,       color: null       },
  { value: 'semester', label: 'Semester',  emoji: '🏖️', bg: '#1e3a5f',  color: '#93c5fd'  },
  { value: 'sjuk',     label: 'Sjukdag',   emoji: '🤒',  bg: '#450a0a',  color: '#fca5a5'  },
  { value: 'vab',      label: 'VAB',       emoji: '👶',  bg: '#451a03',  color: '#fed7aa'  },
  { value: 'tjanst',   label: 'Tjänstl.',  emoji: '✈️', bg: '#042f2e',  color: '#99f6e4'  },
]

const typeInfo = Object.fromEntries(DAY_TYPES.map(t => [t.value, t]))

export default function DayRow({ date, entry, saving, onSave, holiday }) {
  const d = new Date(date + 'T12:00:00')
  const dow = d.getDay()
  const isWeekend = dow === 0 || dow === 6
  const isToday = date === TODAY
  const rowRef = useRef(null)
  const [expanded, setExpanded] = useState(isToday)

  useEffect(() => {
    if (isToday && rowRef.current) {
      setTimeout(() => rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
  }, [])

  const [form, setForm] = useState({
    day_type:   'work',
    p1_start:   '', p1_slut: '', p1_rast: '0',
    p2_start:   '', p2_slut: '', p2_rast: '0',
    anteckning: ''
  })

  useEffect(() => {
    const hasData = entry.p1_start || entry.p1_slut
    setForm({
      day_type:   entry.day_type || 'work',
      p1_start:   entry.p1_start || (isToday && !hasData ? '08:00' : ''),
      p1_slut:    entry.p1_slut  || (isToday && !hasData ? '17:00' : ''),
      p1_rast:    entry.p1_rast  != null ? String(entry.p1_rast) : '0',
      p2_start:   entry.p2_start || '',
      p2_slut:    entry.p2_slut  || '',
      p2_rast:    entry.p2_rast  != null ? String(entry.p2_rast) : '0',
      anteckning: entry.anteckning || ''
    })
  }, [entry])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSave = () => {
    const isWork = form.day_type === 'work'
    onSave({
      day_type:   form.day_type,
      p1_start:   isWork ? (form.p1_start || null) : null,
      p1_slut:    isWork ? (form.p1_slut  || null) : null,
      p1_rast:    isWork ? (parseInt(form.p1_rast) || 0) : 0,
      p2_start:   isWork ? (form.p2_start || null) : null,
      p2_slut:    isWork ? (form.p2_slut  || null) : null,
      p2_rast:    isWork ? (parseInt(form.p2_rast) || 0) : 0,
      anteckning: form.anteckning || null,
    })
    setExpanded(false)
  }

  const hours = entry.timmar || 0
  const hasData = hours > 0
  const dayType = typeInfo[form.day_type] || typeInfo.work
  const isAbsence = form.day_type !== 'work'

  // Row background based on state
  let rowBg = isWeekend ? '#1a2744' : '#1e293b'
  if (holiday && !hasData && !isAbsence) rowBg = '#2d1515'
  if (isAbsence && dayType.bg) rowBg = dayType.bg

  return (
    <div ref={rowRef} style={{
      ...s.row,
      background: rowBg,
      opacity: isWeekend && !isAbsence ? 0.7 : 1,
      outline: isToday ? '2px solid #3b82f6' : 'none'
    }}>
      <div style={s.header} onClick={() => !isWeekend && setExpanded(e => !e)}>
        <div style={s.dateBlock}>
          <div style={{...s.dow, color: isWeekend ? '#64748b' : holiday ? '#f87171' : '#94a3b8'}}>
            {DAYS[dow]}
          </div>
          <div style={s.dayNum}>{d.getDate()} {MONTHS_SHORT[d.getMonth()+1]}</div>
        </div>

        <div style={s.middle}>
          {isAbsence && (
            <div style={{...s.absenceBadge, background: dayType.bg, color: dayType.color}}>
              {dayType.emoji} {dayType.label}
            </div>
          )}
          {!isAbsence && hasData && <div style={s.timeRange}>{entry.p1_start} – {entry.p1_slut}</div>}
          {!isAbsence && holiday && !hasData && (
            <div style={{fontSize:13, color:'#f87171'}}>🎉 {holiday}</div>
          )}
          {entry.anteckning && <div style={s.note}>{entry.anteckning}</div>}
        </div>

        <div style={s.right}>
          {hasData && !isAbsence && <div style={s.hours}>{hours}h</div>}
          {!isWeekend && <div style={{...s.chevron, transform: expanded ? 'rotate(180deg)':'rotate(0deg)'}}>⌄</div>}
        </div>
      </div>

      {expanded && !isWeekend && (
        <div style={s.form}>
          {/* Day type selector */}
          <div style={s.typeRow}>
            {DAY_TYPES.map(t => (
              <button key={t.value}
                style={{...s.typeBtn, ...(form.day_type===t.value ? s.typeBtnActive : {})}}
                onClick={() => set('day_type', t.value)}>
                {t.emoji || '💼'} {t.label}
              </button>
            ))}
          </div>

          {/* Time inputs (only for work days) */}
          {form.day_type === 'work' && (<>
            <div style={s.passLabel}>Pass 1</div>
            <div style={s.row3}>
              <div style={s.field}><label style={s.lbl}>Start</label>
                <input style={s.inp} type="time" value={form.p1_start} onChange={e=>set('p1_start',e.target.value)}/></div>
              <div style={s.field}><label style={s.lbl}>Slut</label>
                <input style={s.inp} type="time" value={form.p1_slut} onChange={e=>set('p1_slut',e.target.value)}/></div>
              <div style={s.field}><label style={s.lbl}>Rast (min)</label>
                <select style={s.inp} value={form.p1_rast} onChange={e=>set('p1_rast',e.target.value)}>
                  {RAST_OPTIONS.map(v=><option key={v} value={v}>{v} min</option>)}
                </select>
              </div>
            </div>

            <div style={s.passLabel}>Pass 2 (valfritt)</div>
            <div style={s.row3}>
              <div style={s.field}><label style={s.lbl}>Start</label>
                <input style={s.inp} type="time" value={form.p2_start} onChange={e=>set('p2_start',e.target.value)}/></div>
              <div style={s.field}><label style={s.lbl}>Slut</label>
                <input style={s.inp} type="time" value={form.p2_slut} onChange={e=>set('p2_slut',e.target.value)}/></div>
              <div style={s.field}><label style={s.lbl}>Rast (min)</label>
                <select style={s.inp} value={form.p2_rast} onChange={e=>set('p2_rast',e.target.value)}>
                  {RAST_OPTIONS.map(v=><option key={v} value={v}>{v} min</option>)}
                </select>
              </div>
            </div>
          </>)}

          <div style={s.field}>
            <label style={s.lbl}>Anteckning</label>
            <input style={s.inp} type="text" value={form.anteckning}
              onChange={e=>set('anteckning',e.target.value)}
              placeholder={holiday ? holiday : 'Vad har du gjort idag?'}/>
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
  row:          { borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' },
  header:       { display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', gap: 12 },
  dateBlock:    { width: 60, flexShrink: 0 },
  dow:          { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  dayNum:       { fontSize: 16, fontWeight: 600, color: '#f1f5f9' },
  middle:       { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  timeRange:    { fontSize: 14, color: '#f1f5f9' },
  note:         { fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  absenceBadge: { fontSize: 13, fontWeight: 600, padding: '2px 8px', borderRadius: 6, alignSelf: 'flex-start' },
  right:        { display: 'flex', alignItems: 'center', gap: 10 },
  hours:        { fontWeight: 700, color: '#3b82f6', fontSize: 16 },
  chevron:      { color: '#64748b', fontSize: 18, transition: 'transform 0.2s', lineHeight: 1 },
  form:         { padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #334155' },
  typeRow:      { display: 'flex', gap: 6, flexWrap: 'wrap' },
  typeBtn:      { background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  typeBtnActive:{ background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 700 },
  passLabel:    { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  row3:         { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  field:        { display: 'flex', flexDirection: 'column', gap: 4 },
  lbl:          { fontSize: 11, color: '#64748b' },
  inp:          { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 15, width: '100%', outline: 'none' },
  saveBtn:      { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 },
}

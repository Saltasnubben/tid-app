import React, { useState, useEffect, useCallback, useMemo } from 'react'
import DayRow from '../components/DayRow.jsx'
import { getSwedishHolidays, calcSchemaHours } from '../utils/holidays.js'

const MONTHS = ['','Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

export default function Timesheet({ API, user }) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [entries, setEntries] = useState({})
  const [workedHours, setWorkedHours] = useState(0)
  const [saving, setSaving] = useState({})

  // Swedish holidays for current year (memoized)
  const holidays = useMemo(() => getSwedishHolidays(year), [year])

  // Schema hours = actual workdays (weekdays minus holidays) × 8h
  const schema = useMemo(() => calcSchemaHours(year, month, holidays), [year, month, holidays])

  // Count absence days from entries (each counts as 8h towards schema coverage)
  const absenceHours = useMemo(() => {
    return Object.values(entries).filter(e =>
      e.day_type && e.day_type !== 'work'
    ).length * 8
  }, [entries])

  const worked = workedHours + absenceHours
  const overtime = Math.round((worked - schema) * 100) / 100

  const load = useCallback(() => {
    fetch(`${API}/timesheet.php?action=month&year=${year}&month=${month}`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => {
        if (r.ok) {
          setEntries(r.data.entries)
          setWorkedHours(r.data.worked)
        }
      })
  }, [year, month, API])

  useEffect(() => { load() }, [load])

  const prevMonth = () => { if (month === 1) { setYear(y=>y-1); setMonth(12) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 12) { setYear(y=>y+1); setMonth(1) } else setMonth(m=>m+1) }

  const save = async (date, data) => {
    setSaving(s => ({...s, [date]: true}))
    const r = await fetch(`${API}/timesheet.php?action=save`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, ...data })
    }).then(r => r.json())
    setSaving(s => ({...s, [date]: false}))
    if (r.ok) {
      setEntries(e => ({...e, [date]: {...(e[date]||{}), ...data, timmar: r.data.timmar}}))
      load()
    }
  }

  const days = getDaysInMonth(year, month)
  const dayList = Array.from({length: days}, (_, i) => {
    const d = String(i+1).padStart(2,'0')
    const m = String(month).padStart(2,'0')
    return `${year}-${m}-${d}`
  })

  const otColor = overtime >= 0 ? '#22c55e' : '#ef4444'

  return (
    <div>
      {/* Month navigator */}
      <div style={s.nav}>
        <button style={s.navBtn} onClick={prevMonth}>‹</button>
        <div style={s.navTitle}>
          <div style={s.navMonth}>{MONTHS[month]}</div>
          <div style={s.navYear}>{year}</div>
        </div>
        <button style={s.navBtn} onClick={nextMonth}>›</button>
      </div>

      {/* Stats bar */}
      <div style={s.stats}>
        <div style={s.stat}>
          <div style={s.statVal}>{worked}h</div>
          <div style={s.statLabel}>Arbetat</div>
        </div>
        <div style={s.statDiv}/>
        <div style={s.stat}>
          <div style={s.statVal}>{schema}h</div>
          <div style={s.statLabel}>Schema</div>
        </div>
        <div style={s.statDiv}/>
        <div style={s.stat}>
          <div style={{...s.statVal, color: otColor}}>
            {overtime >= 0 ? '+':''}{overtime}h
          </div>
          <div style={s.statLabel}>Övertid</div>
        </div>
      </div>

      {/* Day rows */}
      <div style={s.list}>
        {dayList.map(date => (
          <DayRow
            key={date}
            date={date}
            entry={entries[date] || {}}
            saving={!!saving[date]}
            onSave={(data) => save(date, data)}
            holiday={holidays[date] || null}
          />
        ))}
      </div>
    </div>
  )
}

const C = { card: '#1e293b', accent: '#3b82f6', text: '#f1f5f9', muted: '#94a3b8', border: '#334155' }
const s = {
  nav:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:    { background: C.card, border: `1px solid ${C.border}`, color: C.text, width: 44, height: 44, borderRadius: 12, fontSize: 22, cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  navTitle:  { textAlign: 'center' },
  navMonth:  { fontSize: 22, fontWeight: 700, color: C.text },
  navYear:   { fontSize: 14, color: C.muted },
  stats:     { background: C.card, borderRadius: 14, padding: '16px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 16, border: `1px solid ${C.border}` },
  stat:      { textAlign: 'center' },
  statVal:   { fontSize: 20, fontWeight: 700, color: C.text },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
  statDiv:   { width: 1, height: 40, background: C.border },
  list:      { display: 'flex', flexDirection: 'column', gap: 8 },
}

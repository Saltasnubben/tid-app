import React from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export default function TimeInput({ value, onChange, style }) {
  const [h, m] = value ? value.split(':') : ['', '']

  const update = (newH, newM) => {
    if (!newH && !newM) { onChange(''); return }
    onChange(`${newH || '08'}:${newM || '00'}`)
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <select
        style={{ ...style, flex: 1, minWidth: 0 }}
        value={h || ''}
        onChange={e => update(e.target.value, m || '00')}
      >
        <option value="">--</option>
        {HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <select
        style={{ ...style, flex: 1, minWidth: 0 }}
        value={m || ''}
        onChange={e => update(h || '08', e.target.value)}
      >
        <option value="">--</option>
        {MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  )
}

import React, { useState, useEffect } from 'react'

const MONTHS = ['','Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']

export default function Summary({ API }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState({})

  useEffect(() => {
    fetch(`${API}/timesheet.php?action=summary&year=${year}`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => { if (r.ok) setData(r.data) })
  }, [year, API])

  const totalWorked   = Object.values(data).reduce((s,m)=>s+m.worked,0)
  const totalSchema   = Object.values(data).reduce((s,m)=>s+m.schema,0)
  const totalOvertime = Object.values(data).reduce((s,m)=>s+m.overtime,0)

  return (
    <div>
      <div style={s.yearNav}>
        <button style={s.btn} onClick={()=>setYear(y=>y-1)}>‹</button>
        <span style={s.year}>{year}</span>
        <button style={s.btn} onClick={()=>setYear(y=>y+1)}>›</button>
      </div>

      <div style={s.totals}>
        <div style={s.total}><div style={s.tv}>{Math.round(totalWorked)}h</div><div style={s.tl}>Totalt arbetat</div></div>
        <div style={s.tdiv}/>
        <div style={s.total}><div style={s.tv}>{totalSchema}h</div><div style={s.tl}>Schema</div></div>
        <div style={s.tdiv}/>
        <div style={s.total}><div style={{...s.tv, color: totalOvertime>=0?'#22c55e':'#ef4444'}}>{totalOvertime>=0?'+':''}{Math.round(totalOvertime)}h</div><div style={s.tl}>Övertid</div></div>
      </div>

      <div style={s.table}>
        <div style={s.tableHead}>
          <div>Månad</div><div style={s.right}>Arbetat</div><div style={s.right}>Schema</div><div style={s.right}>Övertid</div>
        </div>
        {Array.from({length:12},(_,i)=>i+1).map(m => {
          const row = data[m] || {schema:0,worked:0,overtime:0}
          const ot = row.overtime
          return (
            <div key={m} style={s.tableRow}>
              <div style={s.monthName}>{MONTHS[m]}</div>
              <div style={s.right}>{row.worked}h</div>
              <div style={s.right}>{row.schema}h</div>
              <div style={{...s.right, color: ot>0?'#22c55e':ot<0?'#ef4444':'#94a3b8', fontWeight: ot!==0?700:400}}>
                {ot>0?'+':''}{ot}h
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const C = { card:'#1e293b', border:'#334155', text:'#f1f5f9', muted:'#94a3b8', accent:'#3b82f6' }
const s = {
  yearNav: { display:'flex', alignItems:'center', justifyContent:'center', gap:24, marginBottom:16 },
  btn: { background:C.card, border:`1px solid ${C.border}`, color:C.text, width:40, height:40, borderRadius:10, fontSize:20, cursor:'pointer' },
  year: { fontSize:24, fontWeight:700, color:C.text },
  totals: { background:C.card, borderRadius:14, padding:16, display:'flex', justifyContent:'space-around', alignItems:'center', marginBottom:16, border:`1px solid ${C.border}` },
  total: { textAlign:'center' },
  tv: { fontSize:20, fontWeight:700, color:C.text },
  tl: { fontSize:12, color:C.muted, marginTop:2 },
  tdiv: { width:1, height:40, background:C.border },
  table: { background:C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' },
  tableHead: { display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:16, padding:'10px 16px', background:'#0f172a', fontSize:12, color:C.muted, textTransform:'uppercase', letterSpacing:1 },
  tableRow: { display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:16, padding:'13px 16px', borderTop:`1px solid ${C.border}`, fontSize:15, color:C.text },
  monthName: { fontWeight:500 },
  right: { textAlign:'right', minWidth:48, color:C.muted },
}

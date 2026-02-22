// Svenska helgdagar — returnerar { 'YYYY-MM-DD': 'Helgdagsnamn' }
export function getSwedishHolidays(year) {
  const h = {}

  const add = (month, day, name) => {
    h[`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`] = name
  }

  const fmt = d =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const addOffset = (base, offset, name) => {
    const d = new Date(base); d.setDate(d.getDate() + offset); h[fmt(d)] = name
  }

  // Fasta helgdagar
  add(1,  1,  'Nyårsdagen')
  add(1,  6,  'Trettondag jul')
  add(5,  1,  'Första maj')
  add(6,  6,  'Nationaldagen')
  add(12, 24, 'Julafton')
  add(12, 25, 'Juldagen')
  add(12, 26, 'Annandag jul')
  add(12, 31, 'Nyårsafton')

  // Påsk (Anonym Gregoriansk algoritm)
  const a=year%19, b=Math.floor(year/100), c=year%100
  const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25)
  const g=Math.floor((b-f+1)/3), hh=(19*a+b-d-g+15)%30
  const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-hh-k)%7
  const m=Math.floor((a+11*hh+22*l)/451)
  const eMonth=Math.floor((hh+l-7*m+114)/31)
  const eDay=((hh+l-7*m+114)%31)+1
  const easter = new Date(year, eMonth-1, eDay)

  addOffset(easter, -2, 'Långfredag')
  addOffset(easter,  0, 'Påskdagen')
  addOffset(easter,  1, 'Annandag påsk')
  addOffset(easter, 39, 'Kristi himmelsfärdsdag')
  addOffset(easter, 49, 'Pingstdagen')

  // Midsommar — fredag mellan 19-25 juni
  for (let day = 19; day <= 25; day++) {
    const d = new Date(year, 5, day)
    if (d.getDay() === 5) {
      h[fmt(d)] = 'Midsommarafton'
      const sat = new Date(d); sat.setDate(sat.getDate()+1)
      h[fmt(sat)] = 'Midsommardagen'
      break
    }
  }

  // Alla helgons dag — lördag mellan 31 okt - 6 nov
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(year, 9, 31 + offset)
    if (d.getDay() === 6) { h[fmt(d)] = 'Alla helgons dag'; break }
  }

  return h
}

// Beräkna schema-timmar för en månad (vardagar - helgdagar) × 8h
export function calcSchemaHours(year, month, holidays) {
  const days = new Date(year, month, 0).getDate()
  let workdays = 0
  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    const isWeekend = dow === 0 || dow === 6
    const isHoliday = !!holidays[dateStr]
    if (!isWeekend && !isHoliday) workdays++
  }
  return workdays * 8
}

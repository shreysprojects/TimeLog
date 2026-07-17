// Days are keyed as 'YYYY-MM-DD' in local time; slots are minutes from midnight.

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, n) {
  const dt = keyToDate(key)
  dt.setDate(dt.getDate() + n)
  return todayKey(dt)
}

export function dayLabel(key) {
  return keyToDate(key).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

export function shortDayLabel(key) {
  return keyToDate(key).toLocaleDateString(undefined, {
    weekday: 'short', month: 'numeric', day: 'numeric',
  })
}

export function minsToLabel(mins) {
  const h24 = Math.floor(mins / 60) % 24
  const m = mins % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

export function slotStarts({ interval, activeStart, activeEnd }) {
  const out = []
  for (let t = activeStart; t < activeEnd; t += interval) out.push(t)
  return out
}

export function nowMins() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

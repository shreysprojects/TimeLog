import { useState, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/ThemeContext'
import { useSettings } from '../../lib/SettingsContext'
import { getMonthSummaries } from '../../lib/db'
import { todayKey, slotStarts } from '../../lib/time'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pad(n) {
  return String(n).padStart(2, '0')
}

// Cells for a month grid: nulls for leading/trailing blanks, else day-of-month
function monthCells(year, month) {
  const startDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function CalendarScreen() {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const db = useSQLiteContext()
  const router = useRouter()

  const [visible, setVisible] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [logged, setLogged] = useState({}) // day key -> logged count

  const ym = `${visible.y}-${pad(visible.m + 1)}`

  useFocusEffect(useCallback(() => {
    getMonthSummaries(db, ym)
      .then(rows => {
        const map = {}
        for (const r of rows) map[r.day] = r.logged
        setLogged(map)
      })
      .catch(() => {})
  }, [db, ym]))

  const today = todayKey()
  const nowDate = new Date()
  const atCurrentMonth = visible.y === nowDate.getFullYear() && visible.m === nowDate.getMonth()
  const totalSlots = slotStarts(settings).length

  function shiftMonth(n) {
    setVisible(({ y, m }) => {
      const d = new Date(y, m + n, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const monthTitle = new Date(visible.y, visible.m, 1)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const cells = monthCells(visible.y, visible.m)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={st.container}>
      <View style={[st.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={st.monthNav}>
          <Pressable style={st.navBtn} onPress={() => shiftMonth(-1)}>
            <Ionicons name="chevron-back" size={20} color={theme.subtext} />
          </Pressable>
          <Text style={[st.monthTitle, { color: theme.text }]}>{monthTitle}</Text>
          <Pressable style={st.navBtn} onPress={() => shiftMonth(1)} disabled={atCurrentMonth}>
            <Ionicons name="chevron-forward" size={20} color={atCurrentMonth ? theme.divider : theme.subtext} />
          </Pressable>
        </View>

        <View style={st.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <View key={i} style={st.cell}>
              <Text style={[st.weekday, { color: theme.muted }]}>{w}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={st.weekRow}>
            {week.map((d, di) => {
              if (d === null) return <View key={di} style={st.cell} />

              const key = `${ym}-${pad(d)}`
              const isFuture = key > today
              const isToday = key === today
              const count = logged[key] ?? 0
              const full = totalSlots > 0 && count >= totalSlots

              const circle = [st.dayCircle]
              if (isToday) circle.push({ borderWidth: 2, borderColor: theme.accent })
              if (full) circle.push({ backgroundColor: theme.accent })
              else if (count > 0) circle.push({ backgroundColor: theme.accent + '33' })

              return (
                <Pressable
                  key={di}
                  style={st.cell}
                  disabled={isFuture}
                  onPress={() => router.push(`/day/${key}`)}
                >
                  <View style={circle}>
                    <Text style={{
                      fontSize: 13,
                      fontWeight: isToday || count > 0 ? '700' : '500',
                      color: full ? '#ffffff' : isFuture ? theme.muted : theme.text,
                    }}>
                      {d}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>

      <View style={st.legend}>
        <View style={st.legendItem}>
          <View style={[st.legendDot, { backgroundColor: theme.accent + '33' }]} />
          <Text style={[st.legendText, { color: theme.subtext }]}>partly logged</Text>
        </View>
        <View style={st.legendItem}>
          <View style={[st.legendDot, { backgroundColor: theme.accent }]} />
          <Text style={[st.legendText, { color: theme.subtext }]}>fully logged</Text>
        </View>
      </View>
      <Text style={[st.footnote, { color: theme.muted }]}>
        Tap a day to see and edit its log. Future days unlock when they arrive.
      </Text>
    </ScrollView>
  )
}

const st = StyleSheet.create({
  container: { padding: 12, paddingBottom: 32 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  navBtn: { padding: 8 },
  monthTitle: { fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: { fontSize: 11, fontWeight: '700' },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, fontWeight: '600' },
  footnote: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
})

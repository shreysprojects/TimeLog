import { useState, useCallback } from 'react'
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/ThemeContext'
import { useSettings } from '../../lib/SettingsContext'
import { getDaySummaries } from '../../lib/db'
import { todayKey, addDays, shortDayLabel, slotStarts } from '../../lib/time'

function computeStreak(days) {
  const logged = new Set(days.map(d => d.day))
  let start = todayKey()
  if (!logged.has(start)) start = addDays(start, -1)
  let streak = 0
  let cursor = start
  while (logged.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export default function HistoryScreen() {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const db = useSQLiteContext()
  const router = useRouter()
  const [days, setDays] = useState([])

  useFocusEffect(useCallback(() => {
    getDaySummaries(db).then(setDays).catch(() => {})
  }, [db]))

  const totalSlots = slotStarts(settings).length
  const streak = computeStreak(days)
  const last7 = new Set(Array.from({ length: 7 }, (_, i) => addDays(todayKey(), -i)))
  const weekSlots = days.filter(d => last7.has(d.day)).reduce((sum, d) => sum + d.logged, 0)

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={st.statsRow}>
        <View style={[st.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="flame" size={18} color={theme.accent} />
          <Text style={[st.statNum, { color: theme.text }]}>{streak}</Text>
          <Text style={[st.statLabel, { color: theme.subtext }]}>day streak</Text>
        </View>
        <View style={[st.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="checkbox" size={18} color={theme.accent} />
          <Text style={[st.statNum, { color: theme.text }]}>{weekSlots}</Text>
          <Text style={[st.statLabel, { color: theme.subtext }]}>slots this week</Text>
        </View>
      </View>

      <FlatList
        data={days}
        keyExtractor={d => d.day}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="time-outline" size={40} color={theme.muted} />
            <Text style={[st.emptyText, { color: theme.subtext }]}>
              Nothing logged yet.{'\n'}Today is a good day to start.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const pct = totalSlots > 0 ? Math.min(1, item.logged / totalSlots) : 0
          const isToday = item.day === todayKey()
          return (
            <Pressable
              onPress={() => router.push(`/day/${item.day}`)}
              style={[st.dayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={st.dayCardTop}>
                <Text style={[st.dayName, { color: theme.text }]}>
                  {isToday ? 'Today' : shortDayLabel(item.day)}
                </Text>
                <Text style={[st.dayCount, { color: theme.subtext }]}>
                  {item.logged}/{totalSlots} logged
                </Text>
              </View>
              <View style={[st.track, { backgroundColor: theme.divider }]}>
                <View style={[st.fill, { backgroundColor: theme.accent, width: `${pct * 100}%` }]} />
              </View>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

const st = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  statNum: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  dayCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  dayCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontSize: 14, fontWeight: '700' },
  dayCount: { fontSize: 12, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
})

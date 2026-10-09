import { useState, useCallback, useRef } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/ThemeContext'
import { useSettings } from '../../lib/SettingsContext'
import { hasPermission, rescheduleReminders } from '../../lib/notifications'
import { todayKey, addDays, dayLabel } from '../../lib/time'
import DayTimeline from '../../components/DayTimeline'

export default function TodayScreen() {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const [day, setDay] = useState(todayKey())
  const [counts, setCounts] = useState({ filled: 0, total: 0 })
  const [needsPerm, setNeedsPerm] = useState(false)
  const anchorToday = useRef(todayKey())

  const isToday = day === todayKey()

  useFocusEffect(useCallback(() => {
    // If the date rolled over while the app sat on "today", follow it;
    // an intentionally browsed past day stays put.
    const t = todayKey()
    if (t !== anchorToday.current) {
      setDay(prev => (prev === anchorToday.current ? t : prev))
      anchorToday.current = t
    }
    if (settings.enabled) {
      hasPermission().then(granted => setNeedsPerm(!granted)).catch(() => {})
    } else {
      setNeedsPerm(false)
    }
  }, [settings.enabled]))

  const onCountsChange = useCallback((filled, total) => {
    setCounts({ filled, total })
  }, [])

  async function enableReminders() {
    const n = await rescheduleReminders(settings)
    setNeedsPerm(n === 0)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[st.dayNav, { backgroundColor: theme.header, borderBottomColor: theme.headerBorder }]}>
        <Pressable style={st.navBtn} onPress={() => setDay(d => addDays(d, -1))}>
          <Ionicons name="chevron-back" size={20} color={theme.subtext} />
        </Pressable>

        <Pressable style={st.dayCenter} onPress={() => setDay(todayKey())} disabled={isToday}>
          <Text style={[st.dayTitle, { color: theme.text }]}>{dayLabel(day)}</Text>
          {!isToday && (
            <Text style={[st.backToToday, { color: theme.accent }]}>Tap to return to today</Text>
          )}
        </Pressable>

        <View style={st.navRight}>
          <View style={[st.progressPill, { backgroundColor: theme.accent + '22' }]}>
            <Text style={[st.progressText, { color: theme.accent }]}>
              {counts.filled}/{counts.total}
            </Text>
          </View>
          <Pressable style={st.navBtn} onPress={() => setDay(d => addDays(d, 1))} disabled={isToday}>
            <Ionicons name="chevron-forward" size={20} color={isToday ? theme.divider : theme.subtext} />
          </Pressable>
        </View>
      </View>

      {needsPerm && (
        <Pressable
          onPress={enableReminders}
          style={[st.permBanner, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
        >
          <Ionicons name="notifications-outline" size={16} color={theme.accent} />
          <Text style={[st.permText, { color: theme.accent }]}>
            Tap to allow notifications so TimeLog can remind you to log
          </Text>
        </Pressable>
      )}

      <DayTimeline day={day} onCountsChange={onCountsChange} />
    </View>
  )
}

const st = StyleSheet.create({
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  navBtn: { padding: 8 },
  navRight: { flexDirection: 'row', alignItems: 'center' },
  dayCenter: { flex: 1, alignItems: 'center' },
  dayTitle: { fontSize: 15, fontWeight: '700' },
  backToToday: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: { fontSize: 12, fontWeight: '700' },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  permText: { flex: 1, fontSize: 12, fontWeight: '600' },
})

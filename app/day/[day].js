import { useState, useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../lib/ThemeContext'
import { dayLabel, todayKey } from '../../lib/time'
import DayTimeline from '../../components/DayTimeline'

export default function DayDetail() {
  const { day } = useLocalSearchParams()
  const { theme } = useTheme()
  const [counts, setCounts] = useState({ filled: 0, total: 0 })

  const onCountsChange = useCallback((filled, total) => {
    setCounts({ filled, total })
  }, [])

  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return (
      <View style={[st.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.subtext }}>Invalid day.</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: dayLabel(day) }} />
      <View style={[st.summary, { backgroundColor: theme.header, borderBottomColor: theme.headerBorder }]}>
        <Text style={[st.summaryText, { color: theme.subtext }]}>
          {day > todayKey()
            ? 'This day hasn’t started yet — slots unlock when they arrive'
            : `${counts.filled}/${counts.total} slots logged — tap any slot to edit`}
        </Text>
      </View>
      <DayTimeline day={day} onCountsChange={onCountsChange} />
    </View>
  )
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, alignItems: 'center' },
  summaryText: { fontSize: 12, fontWeight: '600' },
})

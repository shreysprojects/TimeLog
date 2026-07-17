import { useState, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Switch, Modal } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/ThemeContext'
import { useSettings } from '../../lib/SettingsContext'
import { hasPermission, rescheduleReminders, sendTestNotification } from '../../lib/notifications'
import { minsToLabel, slotStarts } from '../../lib/time'

const INTERVALS = [15, 30, 60]

function timeLabel(mins) {
  return mins === 1440 ? 'Midnight' : minsToLabel(mins)
}

export default function SettingsScreen() {
  const { theme, toggleDark } = useTheme()
  const { settings, update } = useSettings()
  const [granted, setGranted] = useState(true)
  const [picking, setPicking] = useState(null) // 'activeStart' | 'activeEnd' | null
  const [testSent, setTestSent] = useState(false)

  useFocusEffect(useCallback(() => {
    hasPermission().then(setGranted).catch(() => {})
  }, []))

  const remindersPerDay = settings.enabled ? slotStarts(settings).length : 0

  const pickerOptions = picking === 'activeStart'
    ? Array.from({ length: 48 }, (_, i) => i * 30).filter(m => m < settings.activeEnd)
    : Array.from({ length: 48 }, (_, i) => (i + 1) * 30).filter(m => m > settings.activeStart)

  async function allowNotifications() {
    const n = await rescheduleReminders(settings)
    setGranted(n > 0 || !settings.enabled)
  }

  async function onTest() {
    const ok = await sendTestNotification()
    setGranted(ok)
    if (ok) {
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    }
  }

  const cardStyle = { backgroundColor: theme.card, borderColor: theme.cardBorder }
  const labelStyle = { color: theme.text, fontSize: 14, fontWeight: '600' }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={st.container}>
      <Text style={[st.sectionTitle, { color: theme.subtext }]}>REMINDERS</Text>
      <View style={[st.card, cardStyle]}>
        <View style={st.row}>
          <Text style={labelStyle}>Remind me to log</Text>
          <Switch
            value={settings.enabled}
            onValueChange={v => update({ enabled: v })}
            trackColor={{ true: theme.accent }}
          />
        </View>

        {settings.enabled && !granted && (
          <Pressable onPress={allowNotifications} style={[st.warnRow, { backgroundColor: theme.danger + '18' }]}>
            <Ionicons name="alert-circle" size={16} color={theme.danger} />
            <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '600', flex: 1 }}>
              Notifications aren't allowed yet — tap to enable
            </Text>
          </Pressable>
        )}

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <View style={st.row}>
          <Text style={labelStyle}>Log every</Text>
          <View style={st.segment}>
            {INTERVALS.map(iv => {
              const active = settings.interval === iv
              return (
                <Pressable
                  key={iv}
                  onPress={() => update({ interval: iv })}
                  style={[st.segmentBtn, {
                    backgroundColor: active ? theme.accent : theme.input,
                    borderColor: active ? theme.accent : theme.inputBorder,
                  }]}
                >
                  <Text style={{
                    color: active ? '#ffffff' : theme.subtext,
                    fontSize: 12, fontWeight: '700',
                  }}>
                    {iv}m
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <Pressable style={st.row} onPress={() => setPicking('activeStart')}>
          <Text style={labelStyle}>Day starts</Text>
          <View style={st.valueWrap}>
            <Text style={[st.value, { color: theme.subtext }]}>{timeLabel(settings.activeStart)}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.muted} />
          </View>
        </Pressable>

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <Pressable style={st.row} onPress={() => setPicking('activeEnd')}>
          <Text style={labelStyle}>Day ends</Text>
          <View style={st.valueWrap}>
            <Text style={[st.value, { color: theme.subtext }]}>{timeLabel(settings.activeEnd)}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.muted} />
          </View>
        </Pressable>

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <Pressable style={st.row} onPress={onTest}>
          <Text style={[labelStyle, { color: theme.accent }]}>
            {testSent ? 'Sent — check in 2 seconds' : 'Send a test notification'}
          </Text>
          <Ionicons name="paper-plane-outline" size={16} color={theme.accent} />
        </Pressable>

        <Text style={[st.footnote, { color: theme.muted }]}>
          {settings.enabled
            ? `${remindersPerDay} reminders per day, ${timeLabel(settings.activeStart)} to ${timeLabel(settings.activeEnd)}`
            : 'Reminders are off'}
        </Text>
      </View>

      <Text style={[st.sectionTitle, { color: theme.subtext }]}>APPEARANCE</Text>
      <View style={[st.card, cardStyle]}>
        <View style={st.row}>
          <Text style={labelStyle}>Dark mode</Text>
          <Switch
            value={theme.isDark}
            onValueChange={toggleDark}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </View>

      <Text style={[st.sectionTitle, { color: theme.subtext }]}>ABOUT</Text>
      <View style={[st.card, cardStyle]}>
        <View style={st.row}>
          <Text style={labelStyle}>Version</Text>
          <Text style={[st.value, { color: theme.subtext }]}>1.0.0</Text>
        </View>
      </View>

      <Modal visible={picking !== null} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <Pressable style={st.pickerBackdrop} onPress={() => setPicking(null)}>
          <View style={[st.pickerCard, cardStyle]}>
            <Text style={[st.pickerTitle, { color: theme.text }]}>
              {picking === 'activeStart' ? 'Day starts at' : 'Day ends at'}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {pickerOptions.map(m => {
                const selected = settings[picking] === m
                return (
                  <Pressable
                    key={m}
                    onPress={() => { update({ [picking]: m }); setPicking(null) }}
                    style={[st.pickerRow, selected && { backgroundColor: theme.accent + '22' }]}
                  >
                    <Text style={{
                      color: selected ? theme.accent : theme.text,
                      fontWeight: selected ? '700' : '500',
                      fontSize: 14,
                    }}>
                      {timeLabel(m)}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

const st = StyleSheet.create({
  container: { padding: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginLeft: 6, marginBottom: 6, marginTop: 14 },
  card: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 10,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  divider: { height: StyleSheet.hairlineWidth },
  segment: { flexDirection: 'row', gap: 6 },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontSize: 13, fontWeight: '600' },
  footnote: { fontSize: 11, fontWeight: '500', paddingBottom: 12, paddingTop: 2 },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,27,94,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  pickerCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  pickerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
})

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, Pressable, ScrollView, Modal, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, Switch,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../lib/ThemeContext'
import { useSettings } from '../lib/SettingsContext'
import { getEntriesForDay, upsertEntry, deleteEntry } from '../lib/db'
import { slotStarts, minsToLabel, nowMins, todayKey, dayLabel } from '../lib/time'

export default function DayTimeline({ day, onCountsChange }) {
  const db = useSQLiteContext()
  const { theme } = useTheme()
  const { settings } = useSettings()

  const [entries, setEntries] = useState({})   // slot_start -> row
  const [editing, setEditing] = useState(null) // slot_start | null
  const [draft, setDraft] = useState('')
  const [isBreak, setIsBreak] = useState(false)
  const [, setTick] = useState(0)

  const scrollRef = useRef(null)
  const didAutoScroll = useRef(false)

  const isToday = day === todayKey()
  const dayIsFuture = day > todayKey() // 'YYYY-MM-DD' keys sort lexicographically
  const slots = slotStarts(settings)
  const now = nowMins()

  // Past and current slots can be logged; slots that haven't started yet can't
  function isLocked(s) {
    return dayIsFuture || (isToday && s > now)
  }

  const load = useCallback(async () => {
    const rows = await getEntriesForDay(db, day)
    const map = {}
    for (const r of rows) map[r.slot_start] = r
    setEntries(map)
  }, [db, day])

  useFocusEffect(useCallback(() => { load().catch(() => {}) }, [load]))

  useEffect(() => {
    didAutoScroll.current = false
  }, [day])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const filled = slots.filter(s => entries[s]).length
  useEffect(() => {
    onCountsChange?.(filled, slots.length)
  }, [filled, slots.length])

  function open(slot) {
    if (isLocked(slot)) return
    const e = entries[slot]
    setDraft(e?.text ?? '')
    setIsBreak(e?.kind === 'break')
    setEditing(slot)
  }

  async function save() {
    const slot = editing
    const text = draft.trim()
    if (!text && !isBreak) {
      if (entries[slot]) await deleteEntry(db, day, slot)
    } else {
      await upsertEntry(db, day, slot, text, isBreak ? 'break' : 'log')
    }
    setEditing(null)
    load().catch(() => {})
  }

  async function clear() {
    if (entries[editing]) await deleteEntry(db, day, editing)
    setEditing(null)
    load().catch(() => {})
  }

  function isCurrent(s) {
    return isToday && now >= s && now < s + settings.interval
  }

  function onRowLayout(slot, e) {
    if (didAutoScroll.current || !isToday || !isCurrent(slot)) return
    didAutoScroll.current = true
    const y = e.nativeEvent.layout.y
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 140), animated: false })
  }

  if (slots.length === 0) {
    return (
      <View style={st.emptyWrap}>
        <Text style={{ color: theme.subtext }}>No time slots — check your active hours in Settings.</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {slots.map((s, i) => {
          const e = entries[s]
          const current = isCurrent(s)
          const past = isToday && !current && s + settings.interval <= now
          const locked = isLocked(s)
          const striped = i % 2 === 0

          return (
            <Pressable
              key={s}
              onLayout={ev => onRowLayout(s, ev)}
              onPress={() => open(s)}
              disabled={locked}
              style={[st.row, {
                backgroundColor: striped ? theme.input : 'transparent',
                borderBottomColor: theme.divider,
                opacity: locked ? 0.45 : 1,
              }]}
            >
              <View style={st.timeCol}>
                <Text style={[st.timeLabel, { color: current ? theme.accent : theme.subtext }]}>
                  {minsToLabel(s)}
                </Text>
              </View>

              <View style={[st.cell,
                current && { borderLeftColor: theme.accent, borderLeftWidth: 3, backgroundColor: theme.accent + '11' },
              ]}>
                {e?.kind === 'break' ? (
                  <View style={[st.breakBlock, { backgroundColor: theme.danger }]}>
                    <Text style={st.breakText}>{e.text || 'Break'}</Text>
                  </View>
                ) : e ? (
                  <Text style={[st.entryText, { color: theme.text }]}>{e.text}</Text>
                ) : current ? (
                  <Text style={[st.hintText, { color: theme.accent }]}>What are you doing right now? Tap to log</Text>
                ) : past ? (
                  <Text style={[st.hintText, { color: theme.muted }]}>—</Text>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={st.modalWrap}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setEditing(null)} />
          <View style={[st.sheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={st.sheetHeader}>
              <Text style={[st.sheetTitle, { color: theme.text }]}>
                {editing !== null ? `${minsToLabel(editing)} – ${minsToLabel(editing + settings.interval)}` : ''}
              </Text>
              <Text style={[st.sheetDay, { color: theme.subtext }]}>{dayLabel(day)}</Text>
            </View>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              autoFocus
              placeholder={'What did you do?\ne.g.\n1. Emails\n2. Gym'}
              placeholderTextColor={theme.muted}
              style={[st.input, {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
                color: theme.text,
              }]}
            />

            <View style={st.breakRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cafe-outline" size={18} color={theme.danger} />
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>Break</Text>
              </View>
              <Switch
                value={isBreak}
                onValueChange={setIsBreak}
                trackColor={{ true: theme.danger }}
              />
            </View>

            <View style={st.buttonRow}>
              {entries[editing] ? (
                <Pressable onPress={clear} style={st.clearBtn}>
                  <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 14 }}>Clear</Text>
                </Pressable>
              ) : <View />}
              <Pressable onPress={save} style={[st.saveBtn, { backgroundColor: theme.accent }]}>
                <Text style={st.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const st = StyleSheet.create({
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: {
    flexDirection: 'row',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeCol: {
    width: 72,
    paddingRight: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeLabel: { fontSize: 11, fontWeight: '600' },
  cell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  entryText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  hintText: { fontSize: 12, fontWeight: '600' },
  breakBlock: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'stretch',
  },
  breakText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,27,94,0.35)' },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetDay: { fontSize: 12, fontWeight: '600' },
  input: {
    minHeight: 96,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  breakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  clearBtn: { paddingVertical: 10, paddingHorizontal: 6 },
  saveBtn: { paddingVertical: 11, paddingHorizontal: 28, borderRadius: 12 },
  saveText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
})

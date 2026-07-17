import { useState, useCallback } from 'react'
import { View, Text, Pressable, TextInput, FlatList, Modal, ScrollView, StyleSheet } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/ThemeContext'
import { getTodos, addTodo, setTodoDone, setTodoDeadline, deleteTodo } from '../../lib/db'
import { todayKey, addDays, keyToDate, minsToLabel, nowMins } from '../../lib/time'

const BUCKETS = [
  { key: 'today',     label: 'Today',     icon: 'sunny-outline',          hint: 'Things to get to later today' },
  { key: 'week',      label: 'Week',      icon: 'calendar-clear-outline', hint: 'Things to do sometime this week' },
  { key: 'anytime',   label: 'Anytime',   icon: 'albums-outline',         hint: 'No deadline — whenever you get to it' },
  { key: 'ambitious', label: 'Ambitious', icon: 'rocket-outline',         hint: 'Big long-term goals worth chipping away at' },
]

const DEADLINE_BUCKETS = ['today', 'week']

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowStamp() {
  const d = new Date()
  return `${todayKey()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Date-only deadlines mean "by end of that day"
function deadlineStamp(t) {
  return t.deadline.length === 10 ? `${t.deadline} 23:59` : t.deadline
}

function isOverdue(t) {
  return !t.done && !!t.deadline && deadlineStamp(t) < nowStamp()
}

function weekdayLabel(dayKey) {
  return keyToDate(dayKey).toLocaleDateString(undefined, { weekday: 'short' })
}

function deadlineLabel(t) {
  const d = t.deadline
  if (d.length === 10) {
    return d === todayKey() ? 'by end of today' : `by ${weekdayLabel(d)}`
  }
  const [day, hm] = d.split(' ')
  const [h, m] = hm.split(':').map(Number)
  const time = hm === '23:59' ? 'end of day' : minsToLabel(h * 60 + m)
  return day === todayKey() ? `by ${time}` : `by ${weekdayLabel(day)} ${time}`
}

// Optional deadline choices: times left today, or days of the coming week
function deadlineOptions(bucket) {
  if (bucket === 'today') {
    const first = Math.ceil((nowMins() + 1) / 30) * 30
    const opts = []
    for (let t = first; t <= 1410; t += 30) {
      opts.push({ value: `${todayKey()} ${pad(Math.floor(t / 60))}:${pad(t % 60)}`, label: minsToLabel(t) })
    }
    opts.push({ value: `${todayKey()} 23:59`, label: 'End of today' })
    return opts
  }
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(todayKey(), i)
    const label = i === 0 ? 'Today'
      : i === 1 ? 'Tomorrow'
      : keyToDate(key).toLocaleDateString(undefined, { weekday: 'long' })
    return { value: key, label }
  })
}

export default function TodosScreen() {
  const { theme } = useTheme()
  const db = useSQLiteContext()
  const [bucket, setBucket] = useState('today')
  const [todos, setTodos] = useState([])
  const [draft, setDraft] = useState('')
  const [deadlinePick, setDeadlinePick] = useState(null) // todo row being edited

  const load = useCallback(() => {
    getTodos(db).then(setTodos).catch(() => {})
  }, [db])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Open items first (earliest deadline up top, no-deadline after), done last
  const items = todos
    .filter(t => t.bucket === bucket)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done - b.done
      const ka = a.deadline ? deadlineStamp(a) : '9999'
      const kb = b.deadline ? deadlineStamp(b) : '9999'
      if (ka !== kb) return ka < kb ? -1 : 1
      return a.id - b.id
    })

  const activeCounts = {}
  for (const t of todos) {
    if (!t.done) activeCounts[t.bucket] = (activeCounts[t.bucket] ?? 0) + 1
  }

  async function add() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    await addTodo(db, text, bucket)
    load()
  }

  async function toggle(t) {
    await setTodoDone(db, t.id, !t.done)
    load()
  }

  async function remove(t) {
    await deleteTodo(db, t.id)
    load()
  }

  async function pickDeadline(value) {
    await setTodoDeadline(db, deadlinePick.id, value)
    setDeadlinePick(null)
    load()
  }

  const current = BUCKETS.find(b => b.key === bucket)
  const pickerOptions = deadlinePick ? deadlineOptions(deadlinePick.bucket) : []

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={st.segmentRow}>
        {BUCKETS.map(b => {
          const active = b.key === bucket
          const count = activeCounts[b.key] ?? 0
          return (
            <Pressable
              key={b.key}
              onPress={() => setBucket(b.key)}
              style={[st.segmentBtn, {
                backgroundColor: active ? theme.accent : theme.card,
                borderColor: active ? theme.accent : theme.cardBorder,
              }]}
            >
              <Ionicons name={b.icon} size={15} color={active ? '#ffffff' : theme.subtext} />
              <Text style={[st.segmentText, { color: active ? '#ffffff' : theme.subtext }]}>
                {b.label}{count > 0 ? ` ${count}` : ''}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={[st.addRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Add to ${current.label}…`}
          placeholderTextColor={theme.muted}
          returnKeyType="done"
          onSubmitEditing={add}
          style={[st.addInput, { color: theme.text }]}
        />
        <Pressable onPress={add} hitSlop={8}>
          <Ionicons name="add-circle" size={30} color={draft.trim() ? theme.accent : theme.muted} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={{ padding: 12, paddingTop: 4, gap: 8, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name={current.icon} size={40} color={theme.muted} />
            <Text style={[st.emptyText, { color: theme.subtext }]}>{current.hint}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const overdue = isOverdue(item)
          const canDeadline = DEADLINE_BUCKETS.includes(item.bucket)
          return (
            <View style={[st.todoCard, {
              backgroundColor: theme.card,
              borderColor: overdue ? theme.danger : theme.cardBorder,
              opacity: item.done ? 0.55 : 1,
            }]}>
              <Pressable onPress={() => toggle(item)} hitSlop={8}>
                <Ionicons
                  name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={item.done ? theme.accent : theme.muted}
                />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[st.todoText, {
                  color: theme.text,
                  textDecorationLine: item.done ? 'line-through' : 'none',
                }]}>
                  {item.text}
                </Text>
                {item.deadline ? (
                  <Text style={[st.deadlineText, { color: overdue ? theme.danger : theme.subtext }]}>
                    {overdue ? `overdue — was ${deadlineLabel(item)}` : deadlineLabel(item)}
                  </Text>
                ) : null}
              </View>
              {canDeadline && !item.done && (
                <Pressable onPress={() => setDeadlinePick(item)} hitSlop={8}>
                  <Ionicons
                    name={item.deadline ? 'alarm' : 'alarm-outline'}
                    size={19}
                    color={overdue ? theme.danger : item.deadline ? theme.accent : theme.muted}
                  />
                </Pressable>
              )}
              <Pressable onPress={() => remove(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={theme.muted} />
              </Pressable>
            </View>
          )
        }}
      />

      <Modal visible={deadlinePick !== null} transparent animationType="fade" onRequestClose={() => setDeadlinePick(null)}>
        <Pressable style={st.pickerBackdrop} onPress={() => setDeadlinePick(null)}>
          <View style={[st.pickerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[st.pickerTitle, { color: theme.text }]} numberOfLines={1}>
              Deadline for “{deadlinePick?.text}”
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <Pressable
                onPress={() => pickDeadline(null)}
                style={[st.pickerRow, !deadlinePick?.deadline && { backgroundColor: theme.accent + '22' }]}
              >
                <Text style={{
                  color: !deadlinePick?.deadline ? theme.accent : theme.text,
                  fontWeight: !deadlinePick?.deadline ? '700' : '500',
                  fontSize: 14,
                }}>
                  No deadline
                </Text>
                {!deadlinePick?.deadline && <Ionicons name="checkmark" size={16} color={theme.accent} />}
              </Pressable>
              {pickerOptions.map(opt => {
                const selected = deadlinePick?.deadline === opt.value
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => pickDeadline(opt.value)}
                    style={[st.pickerRow, selected && { backgroundColor: theme.accent + '22' }]}
                  >
                    <Text style={{
                      color: selected ? theme.accent : theme.text,
                      fontWeight: selected ? '700' : '500',
                      fontSize: 14,
                    }}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const st = StyleSheet.create({
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 12,
    paddingBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  segmentText: { fontSize: 11, fontWeight: '700' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  addInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  todoText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  deadlineText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
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

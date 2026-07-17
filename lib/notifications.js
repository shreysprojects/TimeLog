import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { slotStarts, minsToLabel } from './time'

const CHANNEL_ID = 'log-reminders'

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

export async function ensurePermissions() {
  if (Platform.OS === 'android') {
    // On Android 13+ the channel must exist before the permission prompt
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Log reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const req = await Notifications.requestPermissionsAsync()
  return req.granted
}

export async function hasPermission() {
  const p = await Notifications.getPermissionsAsync()
  return p.granted
}

// One repeating daily notification per slot, fired at the slot's END
// asking what you did during it. Returns how many were scheduled.
export async function rescheduleReminders(settings) {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (!settings.enabled) return 0
  const ok = await ensurePermissions()
  if (!ok) return 0

  let starts = slotStarts(settings)
  // iOS caps pending local notifications at 64 — thin to every other slot if over
  while (starts.length > 60) starts = starts.filter((_, i) => i % 2 === 0)

  for (const s of starts) {
    const end = s + settings.interval
    const fireAt = end % (24 * 60)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Log your time',
        body: `What did you do from ${minsToLabel(s)} to ${minsToLabel(end)}?`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(fireAt / 60),
        minute: fireAt % 60,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    })
  }
  return starts.length
}

export async function sendTestNotification() {
  const ok = await ensurePermissions()
  if (!ok) return false
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Log your time',
      body: 'This is what a reminder will look like.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  })
  return true
}

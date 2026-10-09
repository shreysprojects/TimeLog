import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { rescheduleReminders, hasPermission } from './notifications'

const KEY = '@timelog_settings'

export const DEFAULT_SETTINGS = {
  enabled: true,
  interval: 30,      // minutes per slot: 15 | 30 | 60
  activeStart: 480,  // 8:00 AM
  activeEnd: 1320,   // 10:00 PM
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        const next = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
        setSettings(next)
        setLoaded(true)
        // Re-sync schedules silently on launch, but never prompt for
        // permission here — the first prompt happens from Settings or
        // the Today screen where the user can see why.
        hasPermission().then(granted => {
          if (granted) rescheduleReminders(next).catch(() => {})
        })
      })
      .catch(() => setLoaded(true))
  }, [])

  function update(patch) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
      rescheduleReminders(next).catch(() => {})
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, update, loaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}

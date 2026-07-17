import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ThemeContext = createContext(null)

export const LIGHT = {
  isDark: false,
  bg: '#e8f2ff',
  card: '#ffffff',
  cardBorder: '#bdd4ff',
  text: '#0d1b5e',
  subtext: '#4875b4',
  muted: '#94b8db',
  header: '#ffffff',
  headerBorder: '#bdd4ff',
  tabBar: '#ffffff',
  tabBarBorder: '#0d1b5e',
  input: '#f0f7ff',
  inputBorder: '#bdd4ff',
  divider: '#dceeff',
  accent: '#2b7fff',
  danger: '#e5484d',
  statusBar: 'dark',
}

export const DARK = {
  isDark: true,
  bg: '#0d1b5e',
  card: '#162584',
  cardBorder: '#2b4ab8',
  text: '#ffffff',
  subtext: '#94c5ff',
  muted: '#4875b4',
  header: '#0d1b5e',
  headerBorder: '#162584',
  tabBar: '#0d1b5e',
  tabBarBorder: '#3ddbc0',
  input: '#162584',
  inputBorder: '#2b4ab8',
  divider: '#1a2f82',
  accent: '#3ddbc0',
  danger: '#ff6369',
  statusBar: 'light',
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('@dark_mode').then(v => {
      if (v === 'true') setIsDark(true)
    }).catch(() => {})
  }, [])

  function toggleDark() {
    setIsDark(prev => {
      const next = !prev
      AsyncStorage.setItem('@dark_mode', String(next)).catch(() => {})
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK : LIGHT, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

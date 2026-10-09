import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SQLiteProvider } from 'expo-sqlite'
import { ThemeProvider, useTheme } from '../lib/ThemeContext'
import { SettingsProvider } from '../lib/SettingsContext'
import { DB_NAME, migrate } from '../lib/db'
import { setupNotificationHandler } from '../lib/notifications'

setupNotificationHandler()

function ThemedApp() {
  const { theme } = useTheme()
  return (
    <>
      <StatusBar style={theme.statusBar} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.header },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="day/[day]" options={{ title: 'Day' }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SettingsProvider>
          <SQLiteProvider databaseName={DB_NAME} onInit={migrate}>
            <ThemedApp />
          </SQLiteProvider>
        </SettingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}

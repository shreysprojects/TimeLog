import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../lib/ThemeContext'

const TABS = [
  { name: 'index',    label: 'Today',    icon: 'today-outline',       iconActive: 'today' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar-outline',    iconActive: 'calendar' },
  { name: 'todos',    label: 'To-Do',    icon: 'checkbox-outline',    iconActive: 'checkbox' },
  { name: 'history',  label: 'History',  icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { name: 'settings', label: 'Settings', icon: 'settings-outline',    iconActive: 'settings' },
]

function CustomTabBar({ state, navigation, theme }) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[tb.bar, {
      backgroundColor: theme.tabBar,
      paddingBottom: Math.max(insets.bottom, 10),
    }]}>
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex(r => r.name === tab.name)
        if (routeIndex === -1) return null
        const focused = state.index === routeIndex

        return (
          <Pressable
            key={tab.name}
            style={tb.item}
            onPress={() => { if (!focused) navigation.navigate(tab.name) }}
          >
            <View style={[tb.pill, focused && {
                backgroundColor: theme.accent + '22',
                borderColor: theme.accent,
              }]}>
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={23}
                color={focused ? theme.accent : theme.muted}
              />
            </View>
            <Text style={[tb.label, { color: focused ? theme.accent : theme.muted }]}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    elevation: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  pill: {
    width: 56,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})

export default function TabsLayout() {
  const { theme } = useTheme()

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} theme={theme} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.header },
        headerShadowVisible: false,
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Today' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="todos"    options={{ title: 'To-Do List' }} />
      <Tabs.Screen name="history"  options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  )
}

import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const active = colorScheme === 'dark' ? '#8bd3dd' : '#0a7ea4';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: active,
        tabBarLabelStyle: { fontSize: 12 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Aufgaben',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Kalender',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Ziele',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="flag-outlined" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notizen',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

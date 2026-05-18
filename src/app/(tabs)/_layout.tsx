import React from 'react';
import { View, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useColorScheme } from '@/lib/useColorScheme';
import { Images, MapPin, Settings, Plus } from 'lucide-react-native';
import useAlbumStore from '@/lib/state/album-store';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const setShowCreateModal = useAlbumStore((s) => s.setShowCreateModal);

  const SettingsButton = () => (
    <Pressable
      onPress={() => router.push('/settings')}
      className="active:opacity-60 mr-4"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Settings size={22} color={isDark ? '#F9FAFB' : '#111827'} />
    </Pressable>
  );

  const AddAlbumButton = () => (
    <View className="flex-row items-center">
      <Pressable
        onPress={() => setShowCreateModal(true)}
        className="active:opacity-60 mr-3"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Plus size={24} color={isDark ? '#60A5FA' : '#2563EB'} />
      </Pressable>
      <SettingsButton />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#60A5FA' : '#2563EB',
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
        },
        headerStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
        },
        headerTintColor: isDark ? '#F9FAFB' : '#111827',
        headerShadowVisible: false,
        headerRight: () => <SettingsButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Albums',
          tabBarIcon: ({ color, size }) => <Images color={color} size={size} />,
          headerRight: () => <AddAlbumButton />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

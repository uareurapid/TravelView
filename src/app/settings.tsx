import React from 'react';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/lib/useColorScheme';
import { usePhotoPermissions } from '@/lib/usePermissions';
import { useQueryClient } from '@tanstack/react-query';
import { Images, ChevronRight, CheckCircle2, XCircle, ExternalLink, MapPin, Check } from 'lucide-react-native';
import useSettingsStore, { MapMarkerMode } from '@/lib/state/settings-store';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();
  const { isGranted, isDenied, requestPhotoPermission, isLoading } = usePhotoPermissions();

  // Settings store
  const mapMarkerMode = useSettingsStore((s) => s.mapMarkerMode);
  const setMapMarkerMode = useSettingsStore((s) => s.setMapMarkerMode);

  const handleMapMarkerModeChange = (mode: MapMarkerMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMapMarkerMode(mode);
  };

  const handlePhotoPermission = async () => {
    if (isGranted) {
      // Already granted, open settings if user wants to change
      openSettings();
      return;
    }

    if (isDenied) {
      // If denied, we need to direct to settings
      openSettings();
      return;
    }

    // Request permission
    const status = await requestPhotoPermission();
    if (status === 'granted') {
      // Refresh albums data
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDark ? '#F9FAFB' : '#111827',
          headerShadowVisible: false,
        }}
      />
      <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Permissions Section */}
        <View className="mt-6">
          <Text
            className={`px-4 pb-2 text-xs font-semibold uppercase tracking-wide ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            Permissions
          </Text>

          <View className={`mx-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <Pressable
              onPress={handlePhotoPermission}
              disabled={isLoading}
              className="active:opacity-80"
            >
              <View className="flex-row items-center p-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}
                >
                  <Images size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
                </View>

                <View className="flex-1">
                  <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Photo Library
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isLoading
                      ? 'Checking...'
                      : isGranted
                      ? 'Access granted'
                      : isDenied
                      ? 'Access denied - Tap to open Settings'
                      : 'Tap to grant access'}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  {isGranted ? (
                    <CheckCircle2 size={20} color="#22C55E" />
                  ) : isDenied ? (
                    <>
                      <XCircle size={20} color="#EF4444" />
                      <ExternalLink
                        size={16}
                        color={isDark ? '#6B7280' : '#9CA3AF'}
                        style={{ marginLeft: 8 }}
                      />
                    </>
                  ) : (
                    <ChevronRight size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
                  )}
                </View>
              </View>
            </Pressable>
          </View>

          <Text className={`px-4 pt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Photo library access is required to display your albums and show photos on the map.
          </Text>
        </View>

        {/* Map Section */}
        <View className="mt-8">
          <Text
            className={`px-4 pb-2 text-xs font-semibold uppercase tracking-wide ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            Map
          </Text>

          <View className={`mx-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Label */}
            <View className="px-4 pt-4 pb-2">
              <View className="flex-row items-center">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDark ? 'bg-amber-500/20' : 'bg-amber-100'
                  }`}
                >
                  <MapPin size={20} color={isDark ? '#F59E0B' : '#D97706'} />
                </View>
                <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Add markers on map
                </Text>
              </View>
            </View>

            {/* Option 1: Current album only */}
            <Pressable
              onPress={() => handleMapMarkerModeChange('current_album')}
              className="active:opacity-80"
            >
              <View className={`flex-row items-center px-4 py-3 ml-13 ${
                isDark ? 'border-gray-700' : 'border-gray-100'
              }`}>
                <View className="flex-1">
                  <Text className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    For current album only
                  </Text>
                </View>
                {mapMarkerMode === 'current_album' && (
                  <Check size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
                )}
              </View>
            </Pressable>

            {/* Divider */}
            <View className={`h-px ml-16 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />

            {/* Option 2: All albums */}
            <Pressable
              onPress={() => handleMapMarkerModeChange('all_albums')}
              className="active:opacity-80"
            >
              <View className="flex-row items-center px-4 py-3 ml-13">
                <View className="flex-1">
                  <Text className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    For all albums and photos
                  </Text>
                </View>
                {mapMarkerMode === 'all_albums' && (
                  <Check size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
                )}
              </View>
            </Pressable>
          </View>

          <Text className={`px-4 pt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Choose whether to show markers for photos in the current album or from all your photos.
          </Text>
        </View>

        {/* About Section */}
        <View className="mt-8">
          <Text
            className={`px-4 pb-2 text-xs font-semibold uppercase tracking-wide ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            About
          </Text>

          <View className={`mx-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="p-4">
              <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Photo Map
              </Text>
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                View your photos on a map based on where they were taken.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

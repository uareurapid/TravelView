import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Linking, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/lib/useColorScheme';
import { usePhotoPermissions } from '@/lib/usePermissions';
import { useQueryClient } from '@tanstack/react-query';
import { Images, ChevronRight, CheckCircle2, XCircle, ExternalLink, MapPin, Check, Crown, Sparkles, Share2, FlaskConical, Trash2, Image } from 'lucide-react-native';
import useSettingsStore, { MapMarkerMode } from '@/lib/state/settings-store';
import usePurchasesStore from '@/lib/state/purchases-store';
import * as Haptics from 'expo-haptics';
import { seedDemoData, clearDemoData, isDemoLoaded } from '@/lib/services/demo-data';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isGranted, isDenied, requestPhotoPermission, isLoading } = usePhotoPermissions();

  // Settings store
  const mapMarkerMode = useSettingsStore((s) => s.mapMarkerMode);
  const setMapMarkerMode = useSettingsStore((s) => s.setMapMarkerMode);

  // Purchases
  const isPremium = usePurchasesStore((s) => s.isPremium);

  // Dev-only: demo data state
  const [demoLoaded, setDemoLoaded] = useState(() => isDemoLoaded());
  const [demoBusy, setDemoBusy] = useState(false);

  const handleSeedDemo = useCallback(() => {
    setDemoBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    seedDemoData();
    setDemoLoaded(true);
    setDemoBusy(false);
  }, []);

  const handleClearDemo = useCallback(() => {
    setDemoBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearDemoData();
    setDemoLoaded(false);
    setDemoBusy(false);
  }, []);

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
      <ScrollView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} contentContainerStyle={{ paddingBottom: 40 }}>
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

        {/* Map Tools Section */}
        <View className="mt-8">
          <Text
            className={`px-4 pb-2 text-xs font-semibold uppercase tracking-wide ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            Map Tools
          </Text>

          <View className={`mx-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/map');
              }}
              className="active:opacity-70"
            >
              <View className="flex-row items-center p-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDark ? 'bg-pink-500/20' : 'bg-pink-100'
                  }`}
                >
                  <Share2 size={20} color={isDark ? '#F472B6' : '#EC4899'} />
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Export Map
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Share your travel map as an image
                  </Text>
                </View>
                <ChevronRight size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Premium Section */}
        <View className="mt-8">
          <Text
            className={`px-4 pb-2 text-xs font-semibold uppercase tracking-wide ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            Premium
          </Text>

          <View className={`mx-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {isPremium ? (
              <View className="flex-row items-center p-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isDark ? 'bg-amber-500/20' : 'bg-amber-100'
                  }`}
                >
                  <Crown size={20} color={isDark ? '#FBBF24' : '#D97706'} />
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Lifetime Premium
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    Unlimited albums & all features unlocked
                  </Text>
                </View>
                <CheckCircle2 size={20} color="#22C55E" />
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/paywall');
                }}
                className="active:opacity-80"
              >
                <View className="flex-row items-center p-4">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                      isDark ? 'bg-amber-500/20' : 'bg-amber-100'
                    }`}
                  >
                    <Sparkles size={20} color={isDark ? '#FBBF24' : '#D97706'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Upgrade to Premium
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Unlimited albums, Travel Stats & more
                    </Text>
                  </View>
                  <ChevronRight size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
                </View>
              </Pressable>
            )}
          </View>
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
                Travel View - Explore your trip memories
              </Text>
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                View your photos on a map based on where they were taken.
              </Text>
            </View>
          </View>
        </View>

        {/* Developer Section (enabled via EXPO_PUBLIC_DEV_DEMO=true in .env) */}
        {process.env.EXPO_PUBLIC_DEV_DEMO === 'true' && (
          <View className="mt-8 mb-4">
            <View className="flex-row items-center px-4 pb-2 gap-2">
              <FlaskConical size={12} color="#F59E0B" />
              <Text className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                Developer
              </Text>
            </View>

            <View className={`mx-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800/80' : 'bg-amber-50'}`}
              style={{ borderWidth: 1, borderColor: isDark ? '#92400E55' : '#FDE68A' }}
            >
              {/* Status row */}
              <View className={`flex-row items-center px-4 py-3 ${
                isDark ? 'border-b border-gray-700' : 'border-b border-amber-100'
              }`}>
                <View className={`w-2 h-2 rounded-full mr-2 ${
                  demoLoaded ? 'bg-green-400' : 'bg-gray-400'
                }`} />
                <Text className={`text-sm flex-1 ${
                  isDark ? 'text-gray-300' : 'text-amber-900'
                }`}>
                  Sample photos: {demoLoaded ? '24 loaded (6 trips)' : 'not loaded'}
                </Text>
              </View>

              {/* Load button */}
              <Pressable
                onPress={handleSeedDemo}
                disabled={demoLoaded || demoBusy}
                className="active:opacity-60"
                style={{ opacity: demoLoaded ? 0.4 : 1 }}
              >
                <View className="flex-row items-center p-4">
                  <View className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center mr-3">
                    <Image size={20} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${
                      isDark ? 'text-white' : 'text-amber-900'
                    }`}>
                      Load Sample Photos
                    </Text>
                    <Text className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-amber-700'
                    }`}>
                      24 US landscapes across 6 family trips
                    </Text>
                  </View>
                  {demoLoaded && <CheckCircle2 size={18} color="#22C55E" />}
                </View>
              </Pressable>

              {/* Clear button */}
              <Pressable
                onPress={handleClearDemo}
                disabled={!demoLoaded || demoBusy}
                className="active:opacity-60"
                style={[
                  { opacity: !demoLoaded ? 0.4 : 1 },
                  isDark
                    ? { borderTopWidth: 1, borderTopColor: '#374151' }
                    : { borderTopWidth: 1, borderTopColor: '#FDE68A' },
                ]}
              >
                <View className="flex-row items-center p-4">
                  <View className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center mr-3">
                    <Trash2 size={20} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>
                      Clear Sample Photos
                    </Text>
                    <Text className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-amber-700'
                    }`}>
                      Real photos reload from cache on restart
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

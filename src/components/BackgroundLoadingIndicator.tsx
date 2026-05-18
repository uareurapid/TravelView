import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import useAlbumStore from '@/lib/state/album-store';
import { useColorScheme } from '@/lib/useColorScheme';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface BackgroundLoadingIndicatorProps {
  style?: 'floating' | 'inline';
}

export default function BackgroundLoadingIndicator({ style = 'floating' }: BackgroundLoadingIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isBackgroundLoadingComplete = useAlbumStore((s) => s.isBackgroundLoadingComplete);

  // Don't show if loading is complete
  if (isBackgroundLoadingComplete) {
    return null;
  }

  if (style === 'inline') {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-row items-center justify-center py-2"
      >
        <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#2563EB'} />
        <Text className={`ml-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Syncing photos...
        </Text>
      </Animated.View>
    );
  }

  // Floating style (default)
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className={`absolute top-2 right-2 flex-row items-center px-3 py-1.5 rounded-full ${
        isDark ? 'bg-gray-800/90' : 'bg-white/90'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#2563EB'} />
      <Text className={`ml-2 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        Syncing...
      </Text>
    </Animated.View>
  );
}

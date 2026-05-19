import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import { Images, MapPin, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');

const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

interface Props {
  onComplete: () => void;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Permission request timed out'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function PermissionOnboarding({ onComplete }: Props) {
  const [isRequesting, setIsRequesting] = useState(false);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch (error: unknown) {
      console.warn('Failed to persist onboarding completion:', error);
    }

    onComplete();
  };

  const handleGrantAccess = async () => {
    setIsRequesting(true);

    try {
      const currentPermission = await withTimeout(MediaLibrary.getPermissionsAsync(), 5000);

      if (currentPermission.status !== 'granted' && currentPermission.canAskAgain) {
        await withTimeout(MediaLibrary.requestPermissionsAsync(), 10000);
      }
    } catch (error: unknown) {
      console.warn('Photo permission request failed:', error);
    } finally {
      setIsRequesting(false);
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={{ position: 'absolute', width, height, zIndex: 100 }}
    >
      <LinearGradient
        colors={['#1E3A5F', '#0F172A']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="flex-1 px-6 pt-24 pb-12">
          {/* Icon Display */}
          <Animated.View
            entering={SlideInUp.delay(200).springify()}
            className="items-center mb-8"
          >
            <View className="flex-row items-center justify-center">
              <View className="w-20 h-20 rounded-3xl bg-blue-500/20 items-center justify-center mr-4">
                <Images size={40} color="#60A5FA" />
              </View>
              <View className="w-20 h-20 rounded-3xl bg-emerald-500/20 items-center justify-center">
                <MapPin size={40} color="#34D399" />
              </View>
            </View>
          </Animated.View>

          {/* Title & Description */}
          <Animated.View
            entering={SlideInUp.delay(300).springify()}
            className="items-center mb-12"
          >
            <Text className="text-3xl font-bold text-white text-center mb-4">
              See Your Photos on a Map
            </Text>
            <Text className="text-lg text-gray-300 text-center leading-relaxed">
              Grant access to your photo library to discover where your memories were captured and
              explore them on an interactive map.
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View
            entering={SlideInUp.delay(400).springify()}
            className="mb-12"
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-4">
                <Sparkles size={20} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Browse Albums</Text>
                <Text className="text-gray-400 text-sm">View all your photo albums in one place</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-4">
                <MapPin size={20} color="#34D399" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Location Pins</Text>
                <Text className="text-gray-400 text-sm">
                  See photos pinned on a map where they were taken
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-4">
                <Images size={20} color="#60A5FA" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Private & Secure</Text>
                <Text className="text-gray-400 text-sm">
                  Your photos never leave your device
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Buttons */}
          <Animated.View entering={SlideInUp.delay(500).springify()}>
            <Pressable
              onPress={handleGrantAccess}
              disabled={isRequesting}
              className="active:opacity-80"
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={{
                  borderRadius: 16,
                  paddingVertical: 18,
                  alignItems: 'center',
                  opacity: isRequesting ? 0.6 : 1,
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text className="text-white font-semibold text-lg">
                  {isRequesting ? 'Requesting Access...' : 'Grant Photo Access'}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              disabled={isRequesting}
              className="mt-4 py-4 items-center active:opacity-60"
            >
              <Text className="text-gray-400 font-medium">Maybe Later</Text>
            </Pressable>

            <Text className="text-center text-gray-500 text-xs mt-4">
              You can change this anytime in Settings
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export async function shouldShowOnboarding(): Promise<boolean> {
  const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
  return completed !== 'true';
}

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  FlatList,
  StyleSheet,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Globe,
  Navigation,
  BarChart3,
  Share2,
  Lock,
  ChevronRight,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

interface SlideItem {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  accentColor: string;
  glowColor: string;
  gradientColors: [string, string, string];
}

const SLIDES: SlideItem[] = [
  {
    id: 'hero',
    tag: 'WELCOME',
    tagColor: '#60A5FA',
    title: 'Your Memories,\nMapped',
    description:
      'Every photo tells a story. Discover exactly where all your memories were captured on a beautiful interactive map.',
    Icon: Globe,
    accentColor: '#60A5FA',
    glowColor: '#1D4ED850',
    gradientColors: ['#0C1D3A', '#07112A', '#040810'],
  },
  {
    id: 'trips',
    tag: 'NEW FEATURE',
    tagColor: '#34D399',
    title: 'Auto Trip\nDetection',
    description:
      'TravelView automatically groups your photos into trips — Yosemite 2024, Grand Canyon, Rocky Mountains, and every adventure in between.',
    Icon: Navigation,
    accentColor: '#34D399',
    glowColor: '#05966650',
    gradientColors: ['#091C14', '#07112A', '#040810'],
  },
  {
    id: 'stats',
    tag: 'NEW FEATURE',
    tagColor: '#FBBF24',
    title: 'Travel Stats\n& Insights',
    description:
      "Year-by-year charts of everywhere you've been. Track milestones, total trips, and geotagged memories across your whole library.",
    Icon: BarChart3,
    accentColor: '#FBBF24',
    glowColor: '#D9770650',
    gradientColors: ['#1A1206', '#07112A', '#040810'],
  },
  {
    id: 'export',
    tag: 'NEW FEATURE',
    tagColor: '#F472B6',
    title: 'Share Your\nTravel Map',
    description:
      "Export a stunning snapshot of your personal map and show the world every corner you've explored.",
    Icon: Share2,
    accentColor: '#F472B6',
    glowColor: '#BE185D50',
    gradientColors: ['#1A080F', '#07112A', '#040810'],
  },
  {
    id: 'privacy',
    tag: 'PRIVACY FIRST',
    tagColor: '#A78BFA',
    title: 'Completely\nPrivate',
    description:
      'Your photos never leave your device. No cloud. No uploads. No accounts required. Your memories are yours alone.',
    Icon: Lock,
    accentColor: '#A78BFA',
    glowColor: '#6D28D950',
    gradientColors: ['#10091E', '#07112A', '#040810'],
  },
];

interface Props {
  onComplete: () => void;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    promise
      .then((v) => { clearTimeout(id); resolve(v); })
      .catch((e: unknown) => { clearTimeout(id); reject(e); });
  });
}

function SlideView({ slide }: { slide: SlideItem }) {
  const { Icon, accentColor, glowColor, tag, tagColor, title, description } = slide;
  return (
    <View style={[styles.slide, { width }]}>
      {/* Tag badge */}
      <View
        style={[
          styles.tagBadge,
          { backgroundColor: accentColor + '22', borderColor: accentColor + '55' },
        ]}
      >
        <Text style={[styles.tagText, { color: tagColor }]}>{tag}</Text>
      </View>

      {/* Icon illustration */}
      <View style={styles.iconContainer}>
        <View style={[styles.iconGlow, { backgroundColor: glowColor }]} />
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: accentColor + '18', borderColor: accentColor + '35' },
          ]}
        >
          <Icon size={52} color={accentColor} />
        </View>
      </View>

      {/* Text */}
      <Text style={styles.slideTitle}>{title}</Text>
      <Text style={styles.slideDescription}>{description}</Text>
    </View>
  );
}

export function PermissionOnboarding({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const flatListRef = useRef<FlatList<SlideItem>>(null);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const currentSlide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch {}
    onComplete();
  };

  const handleGrantAccess = async () => {
    setIsRequesting(true);
    try {
      const perm = await withTimeout(MediaLibrary.getPermissionsAsync(), 5000);
      if (perm.status !== 'granted' && perm.canAskAgain) {
        await withTimeout(MediaLibrary.requestPermissionsAsync(), 10000);
      }
    } catch {}
    finally {
      setIsRequesting(false);
      await completeOnboarding();
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleGrantAccess();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (idx != null) setCurrentIndex(idx);
    },
    [],
  );

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ position: 'absolute', width, height, zIndex: 100 }}
    >
      {/* Background gradient updates silently when slide changes */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={currentSlide.gradientColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => <SlideView slide={item} />}
        style={styles.flatList}
      />

      {/* Static footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) + 8 }]}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? { width: 24, backgroundColor: currentSlide.accentColor }
                  : { width: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <Pressable
          onPress={handleNext}
          disabled={isRequesting}
          style={({ pressed }) => [styles.ctaButton, { opacity: pressed || isRequesting ? 0.7 : 1 }]}
        >
          <LinearGradient
            colors={[currentSlide.accentColor, currentSlide.accentColor + 'BB']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.ctaText}>
              {isRequesting ? 'Requesting Access…' : 'Continue'}
            </Text>
            {!isLast && !isRequesting && (
              <View style={{ marginLeft: 6 }}>
                <ChevronRight size={20} color="#fff" />
              </View>
            )}
          </LinearGradient>
        </Pressable>

        {/* Skip — hidden on the permission slide */}
        {!isLast && (
          <Pressable onPress={completeOnboarding} style={styles.skipButton}>
            <Text style={styles.skipText}>Maybe Later</Text>
          </Pressable>
        )}

        <Text style={styles.privacyNote}>You can change this anytime in Settings</Text>
      </View>
    </Animated.View>
  );
}

export async function shouldShowOnboarding(): Promise<boolean> {
  const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
  return completed !== 'true';
}

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 20,
  },
  tagBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 44,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  iconContainer: {
    width: 164,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
  },
  iconGlow: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
  },
  iconCircle: {
    width: 116,
    height: 116,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  slideTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1.2,
    marginBottom: 18,
  },
  slideDescription: {
    fontSize: 16,
    color: '#8B9DB8',
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 310,
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 4,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  ctaButton: {
    width: '100%',
    minWidth: 120,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 10,
  },
  ctaGradient: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 15,
    fontWeight: '500',
  },
  privacyNote: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    marginTop: 2,
  },
});

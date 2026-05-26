import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Plus, Printer, Lock } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import useFrameStore from '@/lib/state/frame-store';
import usePurchasesStore from '@/lib/state/purchases-store';
import { useColorScheme } from '@/lib/useColorScheme';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 16;
const GAP = 12;
const SLOT_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - GAP) / 2;
const SLOT_HEIGHT = SLOT_WIDTH * 0.75;

export default function FrameBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const slots = useFrameStore((s) => s.slots);
  const setSlot = useFrameStore((s) => s.setSlot);
  const clearSlot = useFrameStore((s) => s.clearSlot);
  const isPremium = usePurchasesStore((s) => s.isPremium);

  const frameRef = useRef<View>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);

  const filledCount = slots.filter(Boolean).length;

  // ─── Pick a photo for a given slot ──────────────────────────────────────────
  const handleSlotPress = async (index: number) => {
    setPickingSlot(index);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (!result.canceled && result.assets.length > 0) {
        setSlot(index, result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setPickingSlot(null);
    }
  };

  // ─── Export the frame as a high-res JPEG and share ──────────────────────────
  const handleExport = async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (filledCount === 0) return;

    setIsExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Wait for React to re-render (which hides the X buttons) before capturing
    await new Promise<void>(resolve => setTimeout(resolve, 150));
    try {
      const uri = await captureRef(frameRef, { format: 'jpg', quality: 0.95 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Send to printer (60×40 cm)',
        });
      }
    } catch {
      // share cancelled or failed silently
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={22} color={isDark ? '#E5E7EB' : '#111827'} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Picture Frame
        </Text>

        {/* Balance the close button */}
        <View style={styles.headerBtn} />
      </View>

      {/* ── Subtitle ── */}
      <Text style={[styles.subtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
        Pick photos to fill each slot, then export for print
      </Text>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
      >
        {/* ── Frame grid (captured for export) ── */}
        <View
          ref={frameRef}
          style={[styles.grid, isDark ? styles.darkBg : styles.lightBg]}
          collapsable={false}
        >
          {slots.map((uri, index) => (
            <View key={index} style={styles.slotOuter}>
              {/*
                Use a plain View for border/background — Pressable's function-style
                prop doesn't reliably apply backgroundColor on iOS.
              */}
              <View style={[
                styles.slot,
                uri ? styles.slotFilled : (isDark ? styles.slotDark : styles.slotLight),
              ]}>
                <Pressable
                  onPress={() => handleSlotPress(index)}
                  style={({ pressed }) => [styles.slotPressable, pressed && { opacity: 0.75 }]}
                >
                  {uri ? (
                    /* ── Filled slot ── */
                    <>
                      <Image
                        source={uri}
                        style={styles.slotImage}
                        contentFit="cover"
                        transition={200}
                      />
                      {!isExporting && (
                        <Pressable
                          onPress={() => {
                            clearSlot(index);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={styles.clearBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <View style={styles.clearBtnCircle}>
                            <X size={11} color="#fff" strokeWidth={3} />
                          </View>
                        </Pressable>
                      )}
                    </>
                  ) : (
                    /* ── Empty slot ── */
                    <View style={styles.emptySlot}>
                      {pickingSlot === index ? (
                        <ActivityIndicator size="small" color={isDark ? '#9CA3AF' : '#6B7280'} />
                      ) : (
                        <>
                          <View style={styles.emptyTopArea}>
                            <View style={[
                              styles.plusCircle,
                              { backgroundColor: isDark ? 'rgba(96,165,250,0.18)' : '#DBEAFE' },
                            ]}>
                              <Plus size={22} color={isDark ? '#60A5FA' : '#2563EB'} />
                            </View>
                          </View>
                          <View style={styles.emptyMiddleArea}>
                            <Text style={[
                              styles.emptyLabel,
                              { color: isDark ? '#E5E7EB' : '#4B5563' },
                            ]}>
                              Pick a photo
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Export footer ── */}
      <View
        style={[
          styles.footer,
          isDark ? styles.footerDark : styles.footerLight,
          { paddingBottom: Math.max(insets.bottom, 16) + 4 },
        ]}
      >
        {/* Premium badge when not premium */}
        {!isPremium && (
          <View style={styles.premiumBadge}>
            <Lock size={12} color="#F59E0B" />
            <Text style={styles.premiumBadgeText}>Premium feature</Text>
          </View>
        )}

        {/* Centered button with constrained width */}
        <View style={[
          styles.exportBtnWrap,
          { opacity: filledCount === 0 ? 0.5 : 1 },
        ]}>
          <Pressable
            onPress={handleExport}
            disabled={isExporting || filledCount === 0}
            style={({ pressed }) => [styles.exportBtnPressable, pressed && styles.exportBtnPressed]}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.exportBtnContent}>
                <Printer size={18} color="#fff" />
                <Text style={styles.exportBtnText}>Export for Print</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text style={styles.printNote}>
          {filledCount}/{slots.length} photos · 60×40 cm · JPEG
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  darkBg:   { backgroundColor: '#111827' },
  lightBg:  { backgroundColor: '#F9FAFB' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 20,
    paddingHorizontal: 32,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: H_PAD,
    rowGap: GAP,
    columnGap: GAP,
    paddingTop: H_PAD,
    paddingBottom: 8,
  },

  // Each slot wrapper — explicit height required so flexWrap measures rows correctly
  slotOuter: {
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
  },

  // Slot — plain View so backgroundColor is always reliable
  slot: {
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
  },
  // Pressable fills the slot with explicit dimensions (not flex:1) so children resolve correctly
  slotPressable: {
    flex: 1,
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotFilled: {
    // no border needed when image is present
  },
  slotLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  slotDark: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#475569',
  },

  // Clear button overlay
  clearBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    zIndex: 20,
  },
  clearBtnCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty slot content
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  emptyTopArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
  },
  emptyMiddleArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  plusCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },

  // Export button wrapper — background lives here, not on Pressable
  exportBtnWrap: {
    width: '80%',
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  exportBtnPressable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  exportBtnPressed: {
    opacity: 0.75,
  },
  exportBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footer: {
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 4,
  },
  footerLight: {
    backgroundColor: '#F9FAFB',
    borderTopColor: '#E5E7EB',
  },
  footerDark: {
    backgroundColor: '#111827',
    borderTopColor: '#374151',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  exportBtnText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  printNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
});

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Camera,
  MapPin,
  Compass,
  BarChart3,
  Lock,
  Sparkles,
  CalendarDays,
  Clock,
  X,
  Pencil,
  Check,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/lib/useColorScheme';
import usePhotoStore from '@/lib/state/photo-store';
import usePurchasesStore from '@/lib/state/purchases-store';
import useTripStore from '@/lib/state/trip-store';
import { detectTrips, computePhotoStats, DetectedTrip } from '@/lib/services/trip-detection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_MAX_WIDTH = SCREEN_WIDTH - 120;

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const same = start.toDateString() === end.toDateString();
  if (same) return formatDate(start);
  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

// ──────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────
interface StatCardProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  value: string;
  label: string;
  color: string;
  delay: number;
  isDark: boolean;
}

const StatCard = React.memo(({ icon: Icon, value, label, color, delay, isDark }: StatCardProps) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.statCard}>
    <View
      style={[
        styles.statCardInner,
        { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
      ]}
    >
      <View style={[styles.statIconBg, { backgroundColor: color + '22' }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>{label}</Text>
    </View>
  </Animated.View>
));

// ──────────────────────────────────────────────
// Year Bar
// ──────────────────────────────────────────────
interface YearBarProps {
  year: string;
  count: number;
  maxCount: number;
  isDark: boolean;
  delay: number;
}

const YearBar = React.memo(({ year, count, maxCount, isDark, delay }: YearBarProps) => {
  const barWidth = maxCount > 0 ? (count / maxCount) * BAR_MAX_WIDTH : 0;
  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={styles.yearRow}>
      <Text style={[styles.yearLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{year}</Text>
      <View style={styles.yearBarTrack}>
        <View
          style={[
            styles.yearBarFill,
            {
              width: barWidth,
              backgroundColor: isDark ? '#3B82F6' : '#2563EB',
            },
          ]}
        />
      </View>
      <Text style={[styles.yearCount, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>{count}</Text>
    </Animated.View>
  );
});

// ──────────────────────────────────────────────
// Trip Card
// ──────────────────────────────────────────────
interface TripCardProps {
  trip: DetectedTrip;
  index: number;
  isDark: boolean;
  displayName: string;
  onPress: () => void;
}

const TRIP_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'];

const TripCard = React.memo(({ trip, index, isDark, displayName, onPress }: TripCardProps) => {
  const accent = TRIP_COLORS[index % TRIP_COLORS.length];
  const dateStr = formatDateRange(trip.startDate, trip.endDate);

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).springify()} style={styles.tripCard}>
      <Pressable
        onPress={onPress}
        style={[styles.tripCardInner, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}
      >
        {/* Thumbnail */}
        {trip.thumbnailUri ? (
          <Image
            source={{ uri: trip.thumbnailUri }}
            style={styles.tripThumbnail}
            contentFit="cover"
            recyclingKey={trip.id}
          />
        ) : (
          <View style={[styles.tripThumbnail, { backgroundColor: accent + '33' }]}>
            <Compass size={28} color={accent} />
          </View>
        )}

        {/* Accent bar */}
        <View style={[styles.tripAccentBar, { backgroundColor: accent }]} />

        {/* Info */}
        <View style={styles.tripInfo}>
          <Text style={[styles.tripName, { color: isDark ? '#F9FAFB' : '#111827' }]} numberOfLines={1}>
            {displayName}
          </Text>

          <View style={styles.tripMeta}>
            <CalendarDays size={12} color={isDark ? '#6B7280' : '#9CA3AF'} />
            <Text style={[styles.tripMetaText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
              {dateStr}
            </Text>
          </View>

          <View style={styles.tripFooter}>
            <View style={[styles.tripBadge, { backgroundColor: accent + '22' }]}>
              <Camera size={11} color={accent} />
              <Text style={[styles.tripBadgeText, { color: accent }]}>
                {trip.photoCount} photos
              </Text>
            </View>
            <View style={[styles.tripBadge, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
              <Clock size={11} color={isDark ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.tripBadgeText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                {trip.durationDays}d
              </Text>
            </View>
          </View>
        </View>

        {/* Chevron hint */}
        <View style={{ paddingRight: 12, justifyContent: 'center' }}>
          <Text style={{ color: isDark ? '#374151' : '#D1D5DB', fontSize: 18 }}>›</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ──────────────────────────────────────────────
// Trip Detail Modal
// ──────────────────────────────────────────────
const PHOTO_GRID_COLS = 3;

interface TripDetailModalProps {
  trip: DetectedTrip | null;
  displayName: string;
  isDark: boolean;
  onClose: () => void;
  onSaveName: (name: string) => void;
}

function TripDetailModal({ trip, displayName, isDark, onClose, onSaveName }: TripDetailModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const photos = usePhotoStore((s) => s.photos);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);

  const accent = TRIP_COLORS[0]; // will be passed in a real version, hardcode blue for now
  const bg = isDark ? '#0D1117' : '#F9FAFB';
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const border = isDark ? '#1F2937' : '#E5E7EB';

  const tripPhotos = useMemo(() => {
    if (!trip) return [];
    return trip.photoIds
      .map((id) => photos.get(id))
      .filter(Boolean) as NonNullable<ReturnType<typeof photos.get>>[];
  }, [trip, photos]);

  const photoSize = (Dimensions.get('window').width - 4) / PHOTO_GRID_COLS;

  const handleStartEdit = () => {
    setEditValue(displayName);
    setIsEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) onSaveName(trimmed);
    setIsEditing(false);
  };

  const handlePhotoPress = useCallback((photoId: string, uri: string) => {
    onClose();
    router.push({ pathname: '/photo/[id]', params: { id: photoId, uri } });
  }, [onClose, router]);

  if (!trip) return null;

  return (
    <Modal
      visible={!!trip}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: bg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: insets.top + 16,
                backgroundColor: cardBg,
                borderBottomColor: border,
              },
            ]}
          >
            <Pressable
              onPress={onClose}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              {isEditing ? (
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  autoFocus
                  style={[
                    styles.modalTitleInput,
                    {
                      color: isDark ? '#F9FAFB' : '#111827',
                      borderBottomColor: '#3B82F6',
                    },
                  ]}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  maxLength={60}
                />
              ) : (
                <Text
                  style={[styles.modalTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
              )}
              <Text style={[styles.modalSubtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                {formatDateRange(trip.startDate, trip.endDate)} · {trip.photoCount} photos · {trip.durationDays}d
              </Text>
            </View>

            {isEditing ? (
              <Pressable
                onPress={handleSave}
                style={[styles.modalEditBtn, { backgroundColor: '#3B82F6' }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Check size={16} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleStartEdit}
                style={[styles.modalEditBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Pencil size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </Pressable>
            )}
          </View>

          {/* Photo grid */}
          {tripPhotos.length > 0 ? (
            <FlatList
              data={tripPhotos}
              keyExtractor={(p) => p.id}
              numColumns={PHOTO_GRID_COLS}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handlePhotoPress(item.id, item.uri)}
                  style={{ width: photoSize, height: photoSize, padding: 1 }}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={{ flex: 1 }}
                    contentFit="cover"
                    recyclingKey={item.id}
                  />
                </Pressable>
              )}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Compass size={40} color={isDark ? '#374151' : '#D1D5DB'} />
              <Text style={[styles.emptyText, { color: isDark ? '#6B7280' : '#9CA3AF', marginTop: 12 }]}>
                Photos not yet loaded
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Premium Gate Overlay
// ──────────────────────────────────────────────
function PremiumGate({ isDark, onUpgrade }: { isDark: boolean; onUpgrade: () => void }) {
  return (
    <Animated.View entering={FadeIn.delay(200)} style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(6,9,20,0.85)', 'rgba(6,9,20,0.98)']
            : ['transparent', 'rgba(249,250,251,0.88)', 'rgba(249,250,251,0.99)']
        }
        style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingBottom: 40 }]}
      >
        <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
          <View style={styles.lockCircle}>
            <Lock size={28} color="#FBBF24" />
          </View>
          <Text style={[styles.gateTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Premium Feature
          </Text>
          <Text style={[styles.gateSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Unlock Travel Stats, Trip Detection, and more with a lifetime upgrade.
          </Text>
          <Pressable
            onPress={onUpgrade}
            style={styles.gateButton}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gateButtonGradient}
            >
              <Sparkles size={16} color="#FFFFFF" />
              <Text style={styles.gateButtonText}>Upgrade to Premium</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────
export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const photos = usePhotoStore((s) => s.photos);
  const isPremium = usePurchasesStore((s) => s.isPremium);
  const customNames = useTripStore((s) => s.customNames);
  const setTripName = useTripStore((s) => s.setTripName);

  const [selectedTrip, setSelectedTrip] = useState<DetectedTrip | null>(null);

  const stats = useMemo(() => computePhotoStats(photos), [photos]);
  const trips = useMemo(() => (isPremium ? detectTrips(photos) : []), [photos, isPremium]);

  const maxYearCount = useMemo(
    () => Math.max(1, ...Object.values(stats.photosByYear)),
    [stats.photosByYear],
  );

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  };

  const bgColor = isDark ? '#060914' : '#F9FAFB';
  const sectionBg = isDark ? '#0D1117' : '#F3F4F6';
  const headerBg = isDark ? '#060914' : '#FFFFFF';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg, paddingTop: insets.top + 8 }]}>
        <Animated.Text
          entering={FadeIn.delay(50)}
          style={[styles.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}
        >
          Travel Stats
        </Animated.Text>
        {isPremium && (
          <Animated.View entering={FadeIn.delay(100)} style={styles.premiumBadge}>
            <Sparkles size={11} color="#FBBF24" />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </Animated.View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Cards ── */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={Camera}
            value={String(stats.totalPhotos)}
            label="Total Photos"
            color="#3B82F6"
            delay={80}
            isDark={isDark}
          />
          <StatCard
            icon={MapPin}
            value={String(stats.geotaggedPhotos)}
            label="Geotagged"
            color="#10B981"
            delay={140}
            isDark={isDark}
          />
          <StatCard
            icon={Compass}
            value={isPremium ? String(trips.length) : '?'}
            label="Trips"
            color="#8B5CF6"
            delay={200}
            isDark={isDark}
          />
          <StatCard
            icon={CalendarDays}
            value={String(stats.uniqueYears.length)}
            label="Active Years"
            color="#F59E0B"
            delay={260}
            isDark={isDark}
          />
        </View>

        {/* ── Photos by Year ── */}
        {stats.uniqueYears.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300)} style={[styles.section, { backgroundColor: sectionBg }]}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
              <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                Activity by Year
              </Text>
            </View>
            {stats.uniqueYears.map((year, idx) => (
              <YearBar
                key={year}
                year={String(year)}
                count={stats.photosByYear[String(year)] ?? 0}
                maxCount={maxYearCount}
                isDark={isDark}
                delay={320 + idx * 40}
              />
            ))}
          </Animated.View>
        )}

        {/* ── Trips section (premium-gated) ── */}
        <View style={styles.tripsSection}>
          <Animated.View entering={FadeInDown.delay(360)} style={styles.sectionHeaderRow}>
            <Compass size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
            <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              Detected Trips
            </Text>
            {!isPremium && <Lock size={14} color="#FBBF24" style={{ marginLeft: 6 }} />}
          </Animated.View>

          {isPremium ? (
            trips.length > 0 ? (
              trips.map((trip, idx) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  index={idx}
                  isDark={isDark}
                  displayName={customNames[trip.id] ?? trip.name}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTrip(trip);
                  }}
                />
              ))
            ) : (
              <Animated.View
                entering={FadeInDown.delay(400)}
                style={[styles.emptyTrips, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}
              >
                <Compass size={32} color={isDark ? '#374151' : '#D1D5DB'} />
                <Text style={[styles.emptyText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                  No trips detected yet.{'\n'}Add geotagged photos to get started.
                </Text>
              </Animated.View>
            )
          ) : (
            // Blurred placeholder cards for non-premium
            <View style={{ opacity: 0.35 }}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.tripCard,
                    { opacity: 1 - i * 0.2 },
                  ]}
                >
                  <View
                    style={[
                      styles.tripCardInner,
                      { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
                    ]}
                  >
                    <View style={[styles.tripThumbnail, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]} />
                    <View style={[styles.tripAccentBar, { backgroundColor: TRIP_COLORS[i - 1] }]} />
                    <View style={styles.tripInfo}>
                      <View style={[styles.placeholderLine, { width: 120, backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]} />
                      <View style={[styles.placeholderLine, { width: 80, marginTop: 6, backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Premium gate overlay */}
      {!isPremium && (
        <PremiumGate isDark={isDark} onUpgrade={handleUpgrade} />
      )}

      {/* Trip Detail Modal */}
      <TripDetailModal
        trip={selectedTrip}
        displayName={selectedTrip ? (customNames[selectedTrip.id] ?? selectedTrip.name) : ''}
        isDark={isDark}
        onClose={() => setSelectedTrip(null)}
        onSaveName={(name) => {
          if (selectedTrip) setTripName(selectedTrip.id, name);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(107,114,128,0.2)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FBBF24',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 0,
  },
  statCard: {
    width: '50%',
    padding: 6,
  },
  statCardInner: {
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  yearLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 36,
    textAlign: 'right',
  },
  yearBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(107,114,128,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  yearBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  yearCount: {
    fontSize: 12,
    fontWeight: '500',
    width: 32,
    textAlign: 'right',
  },
  tripsSection: {
    marginBottom: 8,
  },
  tripCard: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  tripCardInner: {
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  tripThumbnail: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripAccentBar: {
    width: 3,
    height: '100%',
  },
  tripInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  tripName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripMetaText: {
    fontSize: 12,
    fontWeight: '400',
  },
  tripFooter: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tripBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyTrips: {
    marginHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  placeholderLine: {
    height: 12,
    borderRadius: 6,
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(251,191,36,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  gateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  gateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  gateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  gateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  // ── Modal ──
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalTitleInput: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    borderBottomWidth: 2,
    paddingBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StyleSheet,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from '@/lib/useColorScheme';
import { X, Edit3, MapPin, Check, Navigation, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import usePhotoStore from '@/lib/state/photo-store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;

interface LocationSuggestion {
  name: string;
  coordinates?: string;
}

export default function PhotoDetailScreen() {
  const { id, uri, photoIndex, photoIds, photoUris } = useLocalSearchParams<{
    id: string;
    uri: string;
    photoIndex?: string;
    photoIds?: string;
    photoUris?: string;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Parse album photos for navigation
  const albumPhotoIds = useMemo(() => {
    try {
      return photoIds ? JSON.parse(photoIds) as string[] : [];
    } catch {
      return [];
    }
  }, [photoIds]);

  const albumPhotoUris = useMemo(() => {
    try {
      return photoUris ? JSON.parse(photoUris) as string[] : [];
    } catch {
      return [];
    }
  }, [photoUris]);

  const hasAlbumNavigation = albumPhotoIds.length > 1;

  // Current photo index state
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = photoIndex ? parseInt(photoIndex, 10) : 0;
    return isNaN(idx) ? 0 : idx;
  });

  // Current photo data
  const currentPhotoId = hasAlbumNavigation ? albumPhotoIds[currentIndex] : id;
  const currentPhotoUri = hasAlbumNavigation ? albumPhotoUris[currentIndex] : uri;

  // Get photo from store
  const getPhoto = usePhotoStore((s) => s.getPhoto);
  const updatePhotoEdits = usePhotoStore((s) => s.updatePhotoEdits);
  const photo = currentPhotoId ? getPhoto(currentPhotoId) : undefined;

  // Animation values for scale/fade effect
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize edit fields when photo loads or edit mode opens
  useEffect(() => {
    if (photo) {
      setEditTitle(photo.title || '');
      setEditLocation(photo.location || '');
    }
  }, [photo?.id]);

  const navigateToPhoto = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
    // Fade and scale in the new photo
    opacity.value = 0;
    scale.value = 0.9;
    opacity.value = withTiming(1, { duration: 250 });
    scale.value = withTiming(1, { duration: 250 }, () => {
      runOnJS(setIsAnimating)(false);
    });
  }, [opacity, scale]);

  const startTransition = useCallback((direction: 'left' | 'right') => {
    if (isAnimating || !hasAlbumNavigation || isEditing) return;

    const totalPhotos = albumPhotoIds.length;
    let newIndex: number;

    if (direction === 'left') {
      // Swipe left = go to next photo
      newIndex = (currentIndex + 1) % totalPhotos;
    } else {
      // Swipe right = go to previous photo
      newIndex = (currentIndex - 1 + totalPhotos) % totalPhotos;
    }

    setIsAnimating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Fade and scale out current photo, then switch
    opacity.value = withTiming(0, { duration: 150 });
    scale.value = withTiming(0.9, { duration: 150 }, () => {
      runOnJS(navigateToPhoto)(newIndex);
    });
  }, [isAnimating, hasAlbumNavigation, isEditing, albumPhotoIds.length, currentIndex, opacity, scale, navigateToPhoto]);

  // Swipe gesture handler
  const panGesture = Gesture.Pan()
    .enabled(!isEditing && hasAlbumNavigation && !isAnimating)
    .onUpdate((event) => {
      translateX.value = event.translationX * 0.3;
    })
    .onEnd((event) => {
      translateX.value = withTiming(0, { duration: 150 });
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        if (event.translationX < 0) {
          runOnJS(startTransition)('left');
        } else {
          runOnJS(startTransition)('right');
        }
      }
    });

  // Animated style for the photo
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  const handleClose = () => {
    if (isEditing) {
      setIsEditing(false);
      if (photo) {
        setEditTitle(photo.title || '');
        setEditLocation(photo.location || '');
      }
    } else {
      router.back();
    }
  };

  const handleStartEditing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
  };

  const handleSaveEdits = () => {
    if (!currentPhotoId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updatePhotoEdits(currentPhotoId, {
      title: editTitle.trim() || undefined,
      location: editLocation.trim() || undefined,
    });
    setIsEditing(false);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  // Navigate with buttons
  const goToPrevious = useCallback(() => {
    startTransition('right');
  }, [startTransition]);

  const goToNext = useCallback(() => {
    startTransition('left');
  }, [startTransition]);

  // Search for location suggestions using geocoding
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingLocation(true);
    setShowSuggestions(true);

    try {
      const coordsMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (coordsMatch) {
        const lat = parseFloat(coordsMatch[1]);
        const lng = parseFloat(coordsMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          try {
            const reverseResults = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (reverseResults.length > 0) {
              const place = reverseResults[0];
              const placeName = [place.name, place.city, place.country].filter(Boolean).join(', ');
              setLocationSuggestions([
                { name: `${lat}, ${lng}`, coordinates: `${lat},${lng}` },
                ...(placeName ? [{ name: placeName, coordinates: `${lat},${lng}` }] : []),
              ]);
            } else {
              setLocationSuggestions([{ name: `${lat}, ${lng}`, coordinates: `${lat},${lng}` }]);
            }
          } catch {
            setLocationSuggestions([{ name: `${lat}, ${lng}`, coordinates: `${lat},${lng}` }]);
          }
          setIsSearchingLocation(false);
          return;
        }
      }

      const results = await Location.geocodeAsync(query);
      const suggestions: LocationSuggestion[] = [];

      for (const result of results.slice(0, 5)) {
        try {
          const reverseResults = await Location.reverseGeocodeAsync({
            latitude: result.latitude,
            longitude: result.longitude,
          });
          if (reverseResults.length > 0) {
            const place = reverseResults[0];
            const placeName = [place.name, place.city, place.region, place.country]
              .filter(Boolean)
              .join(', ');
            suggestions.push({
              name: placeName || query,
              coordinates: `${result.latitude},${result.longitude}`,
            });
          }
        } catch {
          suggestions.push({
            name: query,
            coordinates: `${result.latitude},${result.longitude}`,
          });
        }
      }

      const uniqueSuggestions = suggestions.filter(
        (s, i, arr) => arr.findIndex((x) => x.name === s.name) === i
      );

      setLocationSuggestions(uniqueSuggestions);
    } catch (error) {
      console.log('Geocoding error:', error);
      setLocationSuggestions([]);
    } finally {
      setIsSearchingLocation(false);
    }
  }, []);

  // Debounced location search
  useEffect(() => {
    if (!isEditing) return;

    const timer = setTimeout(() => {
      searchLocation(editLocation);
    }, 500);

    return () => clearTimeout(timer);
  }, [editLocation, isEditing, searchLocation]);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditLocation(suggestion.coordinates || suggestion.name);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleGetCurrentLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSearchingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsSearchingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = `${location.coords.latitude},${location.coords.longitude}`;
      setEditLocation(coords);
      setShowSuggestions(false);
    } catch (error) {
      console.log('Location error:', error);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.background} />

        {/* Header buttons */}
        <Animated.View
          entering={FadeIn.delay(200).duration(300)}
          style={[styles.headerContainer, { top: insets.top + 12 }]}
        >
          <Pressable
            onPress={isEditing ? handleSaveEdits : handleStartEditing}
            style={styles.headerButton}
            className="active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isEditing ? (
              <Check size={24} color="#34D399" />
            ) : (
              <Edit3 size={22} color="#FFFFFF" />
            )}
          </Pressable>

          {hasAlbumNavigation && !isEditing && (
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>
                {currentIndex + 1} / {albumPhotoIds.length}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleClose}
            style={styles.headerButton}
            className="active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>
        </Animated.View>

        {/* Photo with swipe gesture */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.imageContainer}>
            <Animated.View style={[styles.cardContainer, animatedStyle]}>
              <Image
                source={{ uri: currentPhotoUri }}
                style={styles.image}
                contentFit="contain"
                transition={0}
                recyclingKey={currentPhotoId}
              />
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Navigation arrows */}
        {hasAlbumNavigation && !isEditing && !isAnimating && (
          <>
            <Pressable
              onPress={goToPrevious}
              style={[styles.navButton, styles.navButtonLeft]}
              className="active:opacity-70"
            >
              <ChevronLeft size={32} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Pressable
              onPress={goToNext}
              style={[styles.navButton, styles.navButtonRight]}
              className="active:opacity-70"
            >
              <ChevronRight size={32} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </>
        )}

        {/* Edit panel */}
        {isEditing && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.editPanel, { paddingBottom: insets.bottom + 16 }]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter a title for this photo"
                  placeholderTextColor="#6B7280"
                  style={styles.textInput}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.locationHeader}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <Pressable
                    onPress={handleGetCurrentLocation}
                    style={styles.currentLocationButton}
                    className="active:opacity-70"
                  >
                    <Navigation size={16} color="#60A5FA" />
                    <Text style={styles.currentLocationText}>Current</Text>
                  </Pressable>
                </View>
                <View style={styles.locationInputContainer}>
                  <MapPin size={18} color="#6B7280" style={styles.locationIcon} />
                  <TextInput
                    value={editLocation}
                    onChangeText={setEditLocation}
                    placeholder="City, place or coordinates (lat, lng)"
                    placeholderTextColor="#6B7280"
                    style={styles.locationInput}
                    returnKeyType="done"
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {isSearchingLocation && (
                    <ActivityIndicator size="small" color="#60A5FA" />
                  )}
                </View>

                {showSuggestions && locationSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {locationSuggestions.map((suggestion, index) => (
                      <Pressable
                        key={`${suggestion.name}-${index}`}
                        onPress={() => handleSelectSuggestion(suggestion)}
                        style={styles.suggestionItem}
                        className="active:opacity-70"
                      >
                        <MapPin size={14} color="#9CA3AF" />
                        <Text style={styles.suggestionText} numberOfLines={1}>
                          {suggestion.name}
                        </Text>
                        {suggestion.coordinates && (
                          <Text style={styles.suggestionCoords}>
                            {suggestion.coordinates.split(',').map(c => parseFloat(c).toFixed(4)).join(', ')}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}

                <Text style={styles.locationHint}>
                  Enter a place name (e.g., "Lisbon, Portugal") or GPS coordinates (e.g., "38.722252, -9.139337")
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Photo info display (when not editing) */}
        {!isEditing && photo && (photo.title || photo.location) && (
          <Animated.View
            entering={FadeIn.delay(300).duration(300)}
            style={[styles.infoPanel, { bottom: insets.bottom + 16 }]}
          >
            {photo.title && (
              <Text style={styles.infoTitle} numberOfLines={1}>
                {photo.title}
              </Text>
            )}
            {photo.location && (
              <View style={styles.infoLocationRow}>
                <MapPin size={14} color="#9CA3AF" />
                <Text style={styles.infoLocation} numberOfLines={1}>
                  {photo.location}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Swipe hint */}
        {hasAlbumNavigation && !isEditing && (
          <View style={[styles.swipeHint, { bottom: insets.bottom + (photo?.title || photo?.location ? 90 : 20) }]}>
            <Text style={styles.swipeHintText}>Swipe to navigate</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  headerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  navButtonLeft: {
    left: 12,
  },
  navButtonRight: {
    right: 12,
  },
  swipeHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
  editPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderRadius: 8,
  },
  currentLocationText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '500',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  locationHint: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.98)',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionText: {
    flex: 1,
    color: '#E5E7EB',
    fontSize: 14,
  },
  suggestionCoords: {
    color: '#6B7280',
    fontSize: 11,
  },
  infoPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLocation: {
    color: '#9CA3AF',
    fontSize: 14,
    flex: 1,
  },
});

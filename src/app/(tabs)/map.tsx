import React, { useMemo, useCallback, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Image } from 'expo-image';
import { useColorScheme } from '@/lib/useColorScheme';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import usePhotoStore, { PhotoWithUri } from '@/lib/state/photo-store';
import useAlbumStore from '@/lib/state/album-store';
import useSettingsStore from '@/lib/state/settings-store';
import usePurchasesStore from '@/lib/state/purchases-store';
import BackgroundLoadingIndicator from '@/components/BackgroundLoadingIndicator';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { requestAppReview } from '@/lib/requestReview';

async function requestLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    return null;
  }

  const location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

const THUMBNAIL_SIZE = 44;
const LOCATION_TOLERANCE = 0.00001;

/** Parse location string "lat,lng" to coordinates */
function parseLocation(location: string): { latitude: number; longitude: number } | null {
  if (!location) return null;
  const parts = location.split(',');
  if (parts.length !== 2) return null;
  const latitude = parseFloat(parts[0].trim());
  const longitude = parseFloat(parts[1].trim());
  if (isNaN(latitude) || isNaN(longitude)) return null;
  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function normalizeLocation(location: string): string {
  const parsed = parseLocation(location);
  if (parsed) {
    return `${parsed.latitude.toFixed(6)},${parsed.longitude.toFixed(6)}`;
  }
  return location.trim();
}

function isSameLocation(a: string, b: string): boolean {
  const parsedA = parseLocation(a);
  const parsedB = parseLocation(b);

  if (parsedA && parsedB) {
    return (
      Math.abs(parsedA.latitude - parsedB.latitude) <= LOCATION_TOLERANCE
      && Math.abs(parsedA.longitude - parsedB.longitude) <= LOCATION_TOLERANCE
    );
  }

  return normalizeLocation(a) === normalizeLocation(b);
}

/** Photo marker component for performance */
const PhotoMarker = React.memo(function PhotoMarker({
  photo,
  onPress,
}: {
  photo: PhotoWithUri;
  onPress: () => void;
}) {
  const coords = parseLocation(photo.location);
  if (!coords) return null;

  return (
    <Marker
      coordinate={coords}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={false}
    >
      <View style={styles.markerPressable}>
        <View style={styles.markerHead}>
          <Image
            source={{ uri: photo.uri }}
            style={styles.markerImage}
            contentFit="cover"
            recyclingKey={photo.id}
          />
        </View>
        <View style={styles.markerStem} />
        <View style={styles.markerTip} />
      </View>
    </Marker>
  );
});

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<Region | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isPremium = usePurchasesStore((s) => s.isPremium);

  const handleExport = useCallback(async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (!mapRef.current) return;
    try {
      if(isExporting) return; // Prevent multiple taps
      setIsExporting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Give the map an extra moment to finish rendering any pending tiles
      const { width: snapW, height: snapH } = Dimensions.get('window');
      const uri = await mapRef.current.takeSnapshot({
        width: snapW,
        height: snapH,
        region: currentRegionRef.current ?? undefined,
        format: 'jpg',
        quality: 0.9,
        result: 'file',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share your travel map',
        });
        requestAppReview();
      }
    } catch {
      // share cancelled or failed silently
    } finally {
      setIsExporting(false);
    }
  }, [isPremium, router]);

  // Get photos with location from store (includes persisted edits)
  const photos = usePhotoStore((s) => s.photos);
  const photoEdits = usePhotoStore((s) => s.photoEdits);
  const mapMarkerMode = useSettingsStore((s) => s.mapMarkerMode);

  // Get browsed albums and device albums for filtering
  const browsedAlbumIds = useAlbumStore((s) => s.browsedAlbumIds);
  const deviceAlbums = useAlbumStore((s) => s.albums);
  const yearlyAlbums = useAlbumStore((s) => s.yearlyAlbums);
  const customAlbums = useAlbumStore((s) => s.customAlbums);

  // Get photo IDs from browsed albums only
  const browsedPhotoIds = useMemo(() => {
    if (mapMarkerMode === 'all_albums') {
      return null; // null means show all photos
    }

    // If no albums have been browsed yet, show everything (prevents blank map on first launch)
    if (browsedAlbumIds.size === 0) {
      return null;
    }

    // Collect photo IDs from all browsed albums
    const photoIds = new Set<string>();

    browsedAlbumIds.forEach((albumId) => {
      // Check device albums
      const deviceAlbum = deviceAlbums.get(albumId);
      if (deviceAlbum) {
        deviceAlbum.photoIds.forEach((id) => photoIds.add(id));
      }

      // Check yearly albums (albumId format is "year-YYYY", title is "YYYY")
      if (albumId.startsWith('year-')) {
        const year = albumId.replace('year-', '');
        const yearAlbum = yearlyAlbums.get(year);
        if (yearAlbum) {
          yearAlbum.photoIds.forEach((id) => photoIds.add(id));
        }
      }
    });

    return photoIds;
  }, [mapMarkerMode, browsedAlbumIds, deviceAlbums, yearlyAlbums]);

  const photosWithLocation = useMemo(() => {
    const result: PhotoWithUri[] = [];
    photos.forEach((photo) => {
      // If in "current_album" mode, only include photos from browsed albums
      if (browsedPhotoIds !== null && !browsedPhotoIds.has(photo.id)) {
        return;
      }

      // Get merged location (persisted edits take precedence)
      const edits = photoEdits[photo.id];
      const location = edits?.location || photo.location;

      if (location && parseLocation(location)) {
        result.push({
          ...photo,
          location,
        });
      }
    });
    return result;
  }, [photos, photoEdits, browsedPhotoIds]);

  const photosById = useMemo(() => {
    const map = new Map<string, PhotoWithUri>();
    photos.forEach((photo) => {
      map.set(photo.id, photo);
    });
    return map;
  }, [photos]);

  const { data: location, isLoading } = useQuery({
    queryKey: ['userLocation'],
    queryFn: requestLocation,
    staleTime: 1000 * 60 * 10,
  });

  const handlePhotoPress = useCallback((photo: PhotoWithUri) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const matchingAlbum = customAlbums.find((album) => {
      if (!album.location || album.photoIds.length <= 1) {
        return false;
      }

      if (!album.photoIds.includes(photo.id)) {
        return false;
      }

      return album.photoIds.every((photoId) => {
        const albumPhoto = photosById.get(photoId);
        if (!albumPhoto) {
          return false;
        }

        const effectiveLocation = photoEdits[photoId]?.location ?? albumPhoto.location;
        if (!effectiveLocation) {
          return false;
        }

        return isSameLocation(effectiveLocation, album.location);
      });
    });

    if (matchingAlbum) {
      const albumPhotos = matchingAlbum.photoIds
        .map((photoId) => photosById.get(photoId))
        .filter((albumPhoto): albumPhoto is PhotoWithUri => Boolean(albumPhoto));

      const currentIndex = albumPhotos.findIndex((albumPhoto) => albumPhoto.id === photo.id);

      if (albumPhotos.length > 1 && currentIndex >= 0) {
        router.push({
          pathname: '/photo/[id]',
          params: {
            id: photo.id,
            uri: photo.uri,
            photoIds: JSON.stringify(albumPhotos.map((albumPhoto) => albumPhoto.id)),
            photoUris: JSON.stringify(albumPhotos.map((albumPhoto) => albumPhoto.uri)),
            photoIndex: String(currentIndex),
            showAlbumNavHint: '1',
          },
        });
        return;
      }
    }

    router.push({
      pathname: '/photo/[id]',
      params: {
        id: photo.id,
        uri: photo.uri,
      },
    });
  }, [router, customAlbums, photosById, photoEdits]);

  const initialRegion = {
    latitude: location?.latitude ?? 37.78825,
    longitude: location?.longitude ?? -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  if (isLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#2563EB'} />
        <Text className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Loading map...
        </Text>
      </View>
    );
  }

  const photoCount = photosWithLocation.length;

  const emptyStateMessage = (() => {
    if (photoCount > 0) return null;
    if (mapMarkerMode === 'all_albums') {
      return {
        title: 'No geotagged photos',
        body: 'None of your photos have location data. Try enabling location on your camera app.',
      };
    }
    return {
      title: 'No geotagged photos in this album',
      body: 'The selected album has no location data. Switch to "All Albums" in Map Settings, or browse a different album.',
    };
  })();

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onRegionChangeComplete={(r) => { currentRegionRef.current = r; }}
        showsUserLocation
        showsMyLocationButton
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {photosWithLocation.map((photo) => (
          <PhotoMarker
            key={photo.id}
            photo={photo}
            onPress={() => handlePhotoPress(photo)}
          />
        ))}
      </MapView>

      {/* Floating indicator — photo count or empty-state guidance */}
      {emptyStateMessage ? (
        <View
          className={`absolute bottom-6 left-4 right-4 rounded-2xl p-4 ${
            isDark ? 'bg-gray-800/95' : 'bg-white/95'
          }`}
          style={styles.floatingCard}
        >
          <View className="flex-row items-start">
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mr-3 mt-0.5 ${
                isDark ? 'bg-amber-500/20' : 'bg-amber-100'
              }`}
            >
              <MapPin size={20} color={isDark ? '#FCD34D' : '#D97706'} />
            </View>
            <View className="flex-1">
              <Text className={`font-semibold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {emptyStateMessage.title}
              </Text>
              <Text className={`text-sm leading-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {emptyStateMessage.body}
              </Text>
              <Pressable
                onPress={() => router.push('/settings')}
                className="mt-3 self-start"
              >
                <Text className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  Open Map Settings →
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View
          className={`absolute bottom-6 left-4 right-4 rounded-2xl p-4 ${
            isDark ? 'bg-gray-800/90' : 'bg-white/90'
          }`}
          style={styles.floatingCard}
        >
          <View className="flex-row items-center">
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}
            >
              <MapPin size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
            </View>
            <View className="flex-1">
              <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Photo Locations
              </Text>
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {photoCount} photo{photoCount === 1 ? '' : 's'} on map
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Export FAB */}
      <Pressable
        onPress={handleExport}
        disabled={isExporting}
        style={[
          styles.exportFab,
          {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            opacity: isExporting ? 0.5 : 1,
          },
        ]}
      >
        <Share2 size={18} color={isDark ? '#60A5FA' : '#2563EB'} />
      </Pressable>

      {/* Background loading indicator - rendered last so it appears on top */}
      <BackgroundLoadingIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  markerPressable: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  markerHead: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
    overflow: 'hidden',
  },
  markerImage: {
    width: THUMBNAIL_SIZE - 6,
    height: THUMBNAIL_SIZE - 6,
    borderRadius: 0,
  },
  markerStem: {
    width: 6,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    marginTop: -1,
  },
  markerTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -1,
  },
  floatingCard: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  exportFab: {
    position: 'absolute',
    top: 80,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});

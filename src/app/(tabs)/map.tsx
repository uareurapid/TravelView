import React, { useMemo, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Image } from 'expo-image';
import { useColorScheme } from '@/lib/useColorScheme';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import usePhotoStore, { PhotoWithUri } from '@/lib/state/photo-store';
import useAlbumStore from '@/lib/state/album-store';
import useSettingsStore from '@/lib/state/settings-store';
import BackgroundLoadingIndicator from '@/components/BackgroundLoadingIndicator';
import * as Haptics from 'expo-haptics';

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
      <Pressable onPress={onPress} style={styles.markerPressable}>
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
      </Pressable>
    </Marker>
  );
});

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

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

  // Get appropriate message based on mode and photo count
  const getStatusMessage = () => {
    if (photoCount > 0) {
      return `${photoCount} photo${photoCount === 1 ? '' : 's'} on map`;
    }
    if (mapMarkerMode === 'all_albums') {
      return 'Loading photos in background...';
    }
    return 'Browse albums to load photos';
  };

  return (
    <View className="flex-1">
      <MapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
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

      {/* Floating indicator showing photo count */}
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
              {getStatusMessage()}
            </Text>
          </View>
        </View>
      </View>

      {/* Background loading indicator - rendered last so it appears on top */}
      <BackgroundLoadingIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  markerPressable: {
    alignItems: 'center',
  },
  markerHead: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: THUMBNAIL_SIZE / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerImage: {
    width: '100%',
    height: '100%',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});

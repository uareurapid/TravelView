import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { requestAppReview } from '@/lib/requestReview';
import { View, Text, Pressable, ActivityIndicator, Dimensions, StyleSheet, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from '@/lib/useColorScheme';
import { ChevronLeft, ImageOff, MoreVertical, MapPin, Trash2, Images, Camera, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import usePhotoStore, { PhotoWithUri } from '@/lib/state/photo-store';
import useAlbumStore from '@/lib/state/album-store';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = 8;
const FRAME_WIDTH = 4;
const ITEM_WIDTH = (width - GAP * 3 - FRAME_WIDTH * 4) / COLUMN_COUNT;
const PAGE_SIZE = 20;

interface Photo {
  id: string;
  uri: string;
  width: number;
  height: number;
  filename: string;
  creationTime: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface PhotoPage {
  photos: Photo[];
  nextCursor: string | undefined;
  hasMore: boolean;
}

async function fetchPhotosByIds(photoIds: string[]): Promise<Photo[]> {
  const results = await Promise.all(
    photoIds.map(async (photoId) => {
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(photoId);
        if (!assetInfo || !assetInfo.uri) return null;

        return {
          id: assetInfo.id,
          uri: assetInfo.uri,
          width: assetInfo.width ?? 0,
          height: assetInfo.height ?? 0,
          filename: assetInfo.filename ?? assetInfo.id,
          creationTime: assetInfo.creationTime ?? Date.now(),
          location: assetInfo.location
            ? {
                latitude: assetInfo.location.latitude,
                longitude: assetInfo.location.longitude,
              }
            : undefined,
        } as Photo;
      } catch {
        return null;
      }
    })
  );

  return results.filter((item): item is Photo => item !== null);
}

async function fetchAlbumPhotos(albumId: string, albumTitle: string, cursor?: string): Promise<PhotoPage> {
  const assets = await MediaLibrary.getAssetsAsync({
    album: albumId,
    first: PAGE_SIZE,
    after: cursor,
    sortBy: [MediaLibrary.SortBy.creationTime],
    mediaType: [MediaLibrary.MediaType.photo],
  });

  // Fetch detailed info for each asset to get location data
  const photosWithDetails = await Promise.all(
    assets.assets.map(async (asset) => {
      // Get full asset info including location
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);

      return {
        id: asset.id,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        filename: asset.filename,
        creationTime: asset.creationTime,
        location: assetInfo.location ? {
          latitude: assetInfo.location.latitude,
          longitude: assetInfo.location.longitude,
        } : undefined,
      };
    })
  );

  return {
    photos: photosWithDetails,
    nextCursor: assets.hasNextPage ? assets.endCursor : undefined,
    hasMore: assets.hasNextPage,
  };
}

function PhotoCard({ photo, isDark, index, onPress }: { photo: Photo; isDark: boolean; index: number; onPress: () => void }) {
  // Vary heights for comic book effect
  const heightMultiplier = useMemo(() => {
    const multipliers = [1, 1.2, 0.9, 1.1, 1, 0.95, 1.15, 1.05];
    return multipliers[index % multipliers.length];
  }, [index]);

  const itemHeight = ITEM_WIDTH * heightMultiplier;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.photoContainer,
        { width: ITEM_WIDTH + FRAME_WIDTH * 2, marginBottom: GAP },
      ]}
      className="active:opacity-80"
    >
      {/* Comic book style frame */}
      { /* backgroundColor: isDark ? '#1F2937' : '#111827',
       borderColor: isDark ? '#374151' : '#000000', */}
      <View
        style={[
          styles.frame,
          {
            backgroundColor: isDark ? '#1F2937' : '#111827',
            borderColor: isDark ? '#ffffff' : '#000000',
            borderStyle: 'solid',
            borderWidth: 2,
            shadowOffset: { width: 1, height: 3 },
            shadowColor: isDark ? '#f5f5f5' : '#888',
          },
        ]}
      >
        <View
          style={[
            styles.innerFrame,
            {
              width: ITEM_WIDTH,
              height: itemHeight,
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
            },
          ]}
        >
          <Image
            source={{ uri: photo.uri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            recyclingKey={photo.id}
          />
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({
  isDark,
  isCustom,
  onAddFromGallery,
  onTakePhoto,
  disabled,
}: {
  isDark: boolean;
  isCustom: boolean;
  onAddFromGallery?: () => void;
  onTakePhoto?: () => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${
          isDark ? 'bg-gray-800' : 'bg-gray-100'
        }`}
      >
        <ImageOff size={36} color={isDark ? '#60A5FA' : '#2563EB'} />
      </View>
      <Text
        className={`text-xl font-bold text-center mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        No Photos Yet
      </Text>
      <Text
        className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
      >
        {isCustom
          ? 'Add photos to this album to see them here.'
          : 'This album is empty.'}
      </Text>

      {isCustom ? (
        <View className="w-full max-w-sm mt-7 gap-3">
          <Pressable
            onPress={onAddFromGallery}
            disabled={disabled}
            className={`rounded-2xl py-3.5 px-4 flex-row items-center justify-center active:opacity-80 ${disabled ? 'bg-blue-400/70' : 'bg-blue-500'}`}
          >
            <Images size={18} color="#FFFFFF" />
            <Text className="text-white font-semibold ml-2">Add From Gallery</Text>
          </Pressable>
          <Pressable
            onPress={onTakePhoto}
            disabled={disabled}
            className={`rounded-2xl py-3.5 px-4 flex-row items-center justify-center active:opacity-80 ${
              disabled
                ? isDark
                  ? 'bg-gray-700/70'
                  : 'bg-gray-200'
                : isDark
                ? 'bg-gray-700'
                : 'bg-gray-100'
            }`}
          >
            <Camera size={18} color={isDark ? '#E5E7EB' : '#374151'} />
            <Text className={`ml-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Take Photo
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

interface OptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onAddFromGallery: () => void;
  onTakePhoto: () => void;
  onEditLocation: () => void;
  onDelete: () => void;
  isDark: boolean;
}

function OptionsMenu({ visible, onClose, onAddFromGallery, onTakePhoto, onEditLocation, onDelete, isDark }: OptionsMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onPress={onClose}
      >
        <View
          className={`absolute right-4 top-24 rounded-xl overflow-hidden shadow-lg ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
          style={{ minWidth: 220 }}
        >
          <Pressable
            className={`flex-row items-center px-4 py-3 ${
              isDark ? 'active:bg-gray-700' : 'active:bg-gray-100'
            }`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAddFromGallery();
            }}
          >
            <Images size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text
              className={`ml-3 text-base ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Add From Gallery
            </Text>
          </Pressable>
          <View className={`h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <Pressable
            className={`flex-row items-center px-4 py-3 ${
              isDark ? 'active:bg-gray-700' : 'active:bg-gray-100'
            }`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTakePhoto();
            }}
          >
            <Camera size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text
              className={`ml-3 text-base ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Take Photo
            </Text>
          </Pressable>
          <View className={`h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <Pressable
            className={`flex-row items-center px-4 py-3 ${
              isDark ? 'active:bg-gray-700' : 'active:bg-gray-100'
            }`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEditLocation();
            }}
          >
            <MapPin size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text
              className={`ml-3 text-base ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Edit Location
            </Text>
          </Pressable>
          <View className={`h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <Pressable
            className={`flex-row items-center px-4 py-3 ${
              isDark ? 'active:bg-gray-700' : 'active:bg-gray-100'
            }`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDelete();
            }}
          >
            <Trash2 size={20} color="#EF4444" />
            <Text className="ml-3 text-base text-red-500">Delete Album</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

interface LocationModalProps {
  visible: boolean;
  isDark: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
  isSaving: boolean;
}

function LocationModal({ visible, isDark, initialValue, onClose, onSave, isSaving }: LocationModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onPress={onClose}
      >
        <Pressable
          className={`mx-6 w-[88%] max-w-sm rounded-2xl p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
          onPress={() => {}}
        >
          <Text
            className={`text-xl font-bold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Album Location
          </Text>
          <Text
            className={`text-sm mb-4 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            This applies to current photos in this album and future photos you add here.
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="City or coordinates"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            className={`px-4 py-3 rounded-xl text-base ${
              isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
            }`}
          />

          <Text
            className={`text-xs mt-3 ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}
          >
            Tip: for map pins, coordinates work best (example: 38.722252, -9.139337).
          </Text>

          <View className="flex-row mt-6 gap-3">
            <Pressable
              onPress={onClose}
              disabled={isSaving}
              className={`flex-1 py-3 rounded-xl items-center ${
                isDark ? 'bg-gray-700' : 'bg-gray-100'
              } active:opacity-80`}
            >
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} font-semibold`}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onSave(value);
              }}
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl items-center bg-blue-500 active:opacity-80"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold">Save</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface DeleteConfirmModalProps {
  visible: boolean;
  albumTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDark: boolean;
}

function DeleteConfirmModal({ visible, albumTitle, onCancel, onConfirm, isDark }: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onPress={onCancel}
      >
        <Pressable
          className={`mx-6 w-[85%] max-w-sm rounded-2xl p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
          onPress={() => {}}
        >
          <Text
            className={`text-xl font-bold text-center mb-3 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Delete Album?
          </Text>
          <Text
            className={`text-center mb-6 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Are you sure you want to delete "{albumTitle}"? This action cannot be undone.
          </Text>

          <View className="flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className={`flex-1 py-3 rounded-xl items-center ${
                isDark ? 'bg-gray-700' : 'bg-gray-100'
              } active:opacity-80`}
            >
              <Text
                className={`font-semibold ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onConfirm();
              }}
              className="flex-1 py-3 rounded-xl items-center bg-red-500 active:opacity-80"
            >
              <Text className="font-semibold text-white">Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AlbumDetailScreen() {
  const { id, title, isCustom, isYearAlbum } = useLocalSearchParams<{
    id: string;
    title: string;
    isCustom?: string;
    isYearAlbum?: string;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isCustomAlbum = isCustom === 'true';
  const isYearlyAlbum = isYearAlbum === 'true';

  // Modal states
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Updating album...');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Get store data
  const yearlyAlbums = useAlbumStore((s) => s.yearlyAlbums);
  const deviceAlbums = useAlbumStore((s) => s.albums);
  const photosMap = usePhotoStore((s) => s.photos);
  const addPhotos = usePhotoStore((s) => s.addPhotos);
  const addAlbumToPhoto = usePhotoStore((s) => s.addAlbumToPhoto);
  const updatePhotosLocation = usePhotoStore((s) => s.updatePhotosLocation);
  const updatePhotoEdits = usePhotoStore((s) => s.updatePhotoEdits);
  const deleteCustomAlbum = useAlbumStore((s) => s.deleteCustomAlbum);
  const removeAlbumFromAllPhotos = usePhotoStore((s) => s.removeAlbumFromAllPhotos);
  const isAlbumLoaded = useAlbumStore((s) => s.isAlbumLoaded);
  const markAlbumAsBrowsed = useAlbumStore((s) => s.markAlbumAsBrowsed);
  const addPhotosToAlbum = useAlbumStore((s) => s.addPhotosToAlbum);
  const getOrCreateYearlyAlbum = useAlbumStore((s) => s.getOrCreateYearlyAlbum);
  const addPhotoToYearlyAlbum = useAlbumStore((s) => s.addPhotoToYearlyAlbum);
  const setCustomAlbumLocation = useAlbumStore((s) => s.setCustomAlbumLocation);
  const getCustomAlbumById = useAlbumStore((s) => s.getCustomAlbumById);
  const addPhotosToCustomAlbum = useAlbumStore((s) => s.addPhotosToCustomAlbum);
  const getCustomAlbumPhotoIds = useAlbumStore((s) => s.getCustomAlbumPhotoIds);

  const customAlbum = id ? getCustomAlbumById(id) : undefined;
  const customAlbumLocation = customAlbum?.location ?? '';
  const customAlbumPhotoIds = id ? getCustomAlbumPhotoIds(id) : [];

  const showFeedback = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2400);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Mark this album as browsed (for map markers in "current_album" mode)
  useEffect(() => {
    if (id) {
      markAlbumAsBrowsed(id);
    }
  }, [id, markAlbumAsBrowsed]);

  // Check if album photos are already loaded by background loader
  const isPreloaded = id ? isAlbumLoaded(id) : false;

  // Get photos from store for pre-loaded albums or yearly albums
  const storePhotos = useMemo((): Photo[] => {
    if (isCustomAlbum && title) {
      const result: Photo[] = [];
      const customAlbumPhotoIdSet = new Set(customAlbumPhotoIds);

      photosMap.forEach((photo) => {
        if (!customAlbumPhotoIdSet.has(photo.id)) return;

        let location: { latitude: number; longitude: number } | undefined;
        if (photo.location) {
          const parts = photo.location.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              location = { latitude: lat, longitude: lng };
            }
          }
        }

        result.push({
          id: photo.id,
          uri: photo.uri,
          width: 0,
          height: 0,
          filename: photo.title,
          creationTime: photo.date.getTime(),
          location,
        });
      });

      return result.sort((a, b) => b.creationTime - a.creationTime);
    }

    if (isYearlyAlbum && title) {
      // Get photos for yearly album
      const yearAlbum = yearlyAlbums.get(title);
      if (!yearAlbum) return [];

      const result: Photo[] = [];
      yearAlbum.photoIds.forEach((photoId) => {
        const photo = photosMap.get(photoId);
        if (!photo) return;

        let location: { latitude: number; longitude: number } | undefined;
        if (photo.location) {
          const parts = photo.location.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              location = { latitude: lat, longitude: lng };
            }
          }
        }

        result.push({
          id: photo.id,
          uri: photo.uri,
          width: 0,
          height: 0,
          filename: photo.title,
          creationTime: photo.date.getTime(),
          location,
        });
      });
      return result;
    }

    if (isPreloaded && id) {
      // Get photos for pre-loaded device album
      const album = deviceAlbums.get(id);
      if (!album) return [];

      const result: Photo[] = [];
      album.photoIds.forEach((photoId) => {
        const photo = photosMap.get(photoId);
        if (!photo) return;

        let location: { latitude: number; longitude: number } | undefined;
        if (photo.location) {
          const parts = photo.location.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              location = { latitude: lat, longitude: lng };
            }
          }
        }

        result.push({
          id: photo.id,
          uri: photo.uri,
          width: 0,
          height: 0,
          filename: photo.title,
          creationTime: photo.date.getTime(),
          location,
        });
      });
      return result;
    }

    return [];
  }, [isCustomAlbum, isYearlyAlbum, isPreloaded, title, id, customAlbumPhotoIds, yearlyAlbums, deviceAlbums, photosMap]);

  const missingCustomPhotoIds = useMemo(() => {
    if (!isCustomAlbum) return [] as string[];
    return customAlbumPhotoIds.filter((photoId) => !photosMap.has(photoId));
  }, [isCustomAlbum, customAlbumPhotoIds, photosMap]);

  const { data: fetchedCustomPhotos, isLoading: isLoadingCustomPhotos } = useQuery({
    queryKey: ['custom-album-photos', id, missingCustomPhotoIds.join(',')],
    queryFn: () => fetchPhotosByIds(missingCustomPhotoIds),
    enabled: isCustomAlbum && missingCustomPhotoIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isCustomAlbum || !title) return;
    if (!fetchedCustomPhotos || fetchedCustomPhotos.length === 0) return;

    const mapped: PhotoWithUri[] = fetchedCustomPhotos.map((photo) => {
      const year = new Date(photo.creationTime).getFullYear().toString();
      const locationString = photo.location
        ? `${photo.location.latitude},${photo.location.longitude}`
        : '';

      return {
        id: photo.id,
        title: photo.filename || photo.id,
        date: new Date(photo.creationTime),
        location: locationString,
        albums: [title, year],
        uri: photo.uri,
      };
    });

    addPhotos(mapped);
  }, [isCustomAlbum, title, fetchedCustomPhotos, addPhotos]);

  // Only use infinite query if album is NOT pre-loaded and NOT a yearly album
  const shouldFetchFromDevice = !isCustomAlbum && !isYearlyAlbum && !isPreloaded;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['album-photos', id, title],
    queryFn: ({ pageParam }) => fetchAlbumPhotos(id ?? '', title ?? 'Unknown', pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!id && shouldFetchFromDevice,
    staleTime: 1000 * 60 * 5,
  });

  // Combine store photos with fetched photos
  const photos = useMemo(() => {
    if (isCustomAlbum) {
      const merged = [...storePhotos];

      (fetchedCustomPhotos ?? []).forEach((photo) => {
        if (merged.some((item) => item.id === photo.id)) return;
        merged.push(photo);
      });

      return merged.sort((a, b) => b.creationTime - a.creationTime);
    }

    // If we have store photos (yearly album or pre-loaded), use them
    if (storePhotos.length > 0) return storePhotos;
    // Otherwise use fetched data
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.photos);
  }, [isCustomAlbum, storePhotos, fetchedCustomPhotos, data?.pages]);

  // Track if we've processed photos for this album to avoid infinite loops
  const processedPhotosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Skip if this is a yearly album or pre-loaded album (photos already processed)
    if (isYearlyAlbum || isPreloaded) return;
    if (!title || !id || photos.length === 0) return;

    // Only process photos that haven't been processed yet
    const newPhotos = photos.filter((p) => !processedPhotosRef.current.has(p.id));
    if (newPhotos.length === 0) return;

    // Mark photos as processed before updating store to prevent re-triggering
    newPhotos.forEach((p) => processedPhotosRef.current.add(p.id));

    // Create photo models
    const photoModels: PhotoWithUri[] = newPhotos.map((photo) => ({
      id: photo.id,
      title: photo.filename || photo.id,
      date: new Date(photo.creationTime),
      location: photo.location
        ? `${photo.location.latitude},${photo.location.longitude}`
        : '',
      albums: [title],
      uri: photo.uri,
    }));

    // Add photos to photo store
    addPhotos(photoModels);

    // Add photo IDs to the album
    const photoIds = newPhotos.map((p) => p.id);
    addPhotosToAlbum(id, photoIds);

    // Create yearly albums based on photo dates
    newPhotos.forEach((photo) => {
      const photoDate = new Date(photo.creationTime);
      const year = photoDate.getFullYear().toString();

      // Get or create the yearly album
      getOrCreateYearlyAlbum(year);

      // Add this photo to the yearly album
      addPhotoToYearlyAlbum(year, photo.id);

      // Add the yearly album reference to the photo
      addAlbumToPhoto(photo.id, year);
    });
  }, [photos, title, id, isYearlyAlbum, isPreloaded, addPhotos, addPhotosToAlbum, getOrCreateYearlyAlbum, addPhotoToYearlyAlbum, addAlbumToPhoto]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePhotoPress = useCallback((photo: Photo, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Pass the photo IDs as a JSON string for navigation within album
    const photoIds = photos.map((p) => p.id);
    const photoUris = photos.map((p) => p.uri);
    router.push({
      pathname: '/photo/[id]',
      params: {
        id: photo.id,
        uri: photo.uri,
        photoIndex: index.toString(),
        photoIds: JSON.stringify(photoIds),
        photoUris: JSON.stringify(photoUris),
      },
    });
  }, [router, photos]);

  const handleEditLocation = useCallback(() => {
    setShowOptionsMenu(false);
    setShowLocationModal(true);
  }, []);

  const findExistingPhotoId = useCallback((candidateId?: string | null, candidateUri?: string): string | null => {
    if (candidateId && photosMap.has(candidateId)) {
      return candidateId;
    }

    if (!candidateUri) {
      return null;
    }

    for (const [existingId, photo] of photosMap.entries()) {
      if (photo.uri === candidateUri) {
        return existingId;
      }
    }

    return null;
  }, [photosMap]);

  const resolveCreationDate = useCallback(async (assetId?: string | null, fallbackMs?: number): Promise<Date> => {
    if (assetId) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(assetId);
        if (info.creationTime && !Number.isNaN(info.creationTime)) {
          return new Date(info.creationTime);
        }
      } catch {
        // Fall back below.
      }
    }

    if (fallbackMs && !Number.isNaN(fallbackMs)) {
      return new Date(fallbackMs);
    }

    return new Date();
  }, []);

  const normalizeLocationValue = useCallback(async (value: string): Promise<string> => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const coordsMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return `${lat},${lng}`;
      }
    }

    try {
      const geocoded = await Location.geocodeAsync(trimmed);
      if (geocoded.length > 0) {
        const first = geocoded[0];
        return `${first.latitude},${first.longitude}`;
      }
    } catch {
      return trimmed;
    }

    return trimmed;
  }, []);

  const handleSaveAlbumLocation = useCallback(async (value: string) => {
    if (!id) return;

    setIsSavingLocation(true);

    try {
      const normalized = await normalizeLocationValue(value);
      setCustomAlbumLocation(id, normalized);

      const albumPhotoIds = isCustomAlbum
        ? customAlbumPhotoIds
        : photos.map((photo) => photo.id).filter((photoId) => photoId.length > 0);

      updatePhotosLocation(albumPhotoIds, normalized);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showFeedback(
        normalized
          ? 'Album location saved and applied to current and future photos.'
          : 'Album location cleared for current and future photos.',
        'success'
      );
      setShowLocationModal(false);
      if (normalized) requestAppReview();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showFeedback('Could not save album location. Please try again.', 'error');
    } finally {
      setIsSavingLocation(false);
    }
  }, [id, isCustomAlbum, customAlbumPhotoIds, normalizeLocationValue, setCustomAlbumLocation, photos, updatePhotosLocation, showFeedback]);

  const handleAddFromGallery = useCallback(async () => {
    if (!id || !title) return;
    setShowOptionsMenu(false);
    setBusyLabel('Adding photos from gallery...');
    setIsImporting(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showFeedback('Photo access is required to import from gallery.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 30,
        quality: 1,
      });

      const selectedAssets = result.assets ?? [];
      if (result.canceled || selectedAssets.length === 0) return;

      const newPhotos: PhotoWithUri[] = [];
      const newPhotoIds: string[] = [];
      const inheritedLocation = customAlbumLocation;
      let linkedCount = 0;
      const baseTimestamp = Date.now();

      for (let idx = 0; idx < selectedAssets.length; idx += 1) {
        const asset = selectedAssets[idx];
        const resolvedExistingId = findExistingPhotoId(asset.assetId, asset.uri);
        const photoId = resolvedExistingId ?? asset.assetId ?? `picked-${baseTimestamp}-${idx}`;
        const existing = photosMap.get(photoId);

        if (existing) {
          addAlbumToPhoto(photoId, title);
          newPhotoIds.push(photoId);
          linkedCount += 1;
          if (inheritedLocation) {
            updatePhotoEdits(photoId, { location: inheritedLocation });
          }
          continue;
        }

        const creationDate = await resolveCreationDate(asset.assetId, baseTimestamp + idx);
        const year = creationDate.getFullYear().toString();
        const photoLocation = inheritedLocation || '';
        const uniqueAlbums = Array.from(new Set([title, year]));

        newPhotos.push({
          id: photoId,
          title: asset.fileName || photoId,
          date: creationDate,
          location: photoLocation,
          albums: uniqueAlbums,
          uri: asset.uri,
        });
        newPhotoIds.push(photoId);
        linkedCount += 1;

        getOrCreateYearlyAlbum(year);
        addPhotoToYearlyAlbum(year, photoId);
      }

      if (newPhotos.length > 0) {
        addPhotos(newPhotos);
      }

      if (newPhotoIds.length > 0) {
        addPhotosToAlbum(id, newPhotoIds);
        addPhotosToCustomAlbum(id, newPhotoIds);
      }

      if (linkedCount > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showFeedback(
          `${linkedCount} photo${linkedCount === 1 ? '' : 's'} added to ${title}.`,
          'success'
        );
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      showFeedback(`Could not add photos from gallery. ${errorMessage}`, 'error');
    } finally {
      setIsImporting(false);
    }
  }, [id, title, customAlbumLocation, findExistingPhotoId, resolveCreationDate, photosMap, addAlbumToPhoto, updatePhotoEdits, getOrCreateYearlyAlbum, addPhotoToYearlyAlbum, addPhotos, addPhotosToAlbum, addPhotosToCustomAlbum, showFeedback]);

  const handleTakePhoto = useCallback(async () => {
    if (!id || !title) return;
    setShowOptionsMenu(false);
    setBusyLabel('Saving captured photo...');
    setIsImporting(true);

    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showFeedback('Camera access is required to take a photo here.', 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      const capturedAssets = result.assets ?? [];
      if (result.canceled || capturedAssets.length === 0) return;

      const captured = capturedAssets[0];

      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showFeedback('Photo library access is required to save the captured photo.', 'error');
        return;
      }

      let savedAssetUri = captured.uri;
      let photoId = `captured-${Date.now()}`;

      try {
        const savedAsset = await MediaLibrary.createAssetAsync(captured.uri);
        savedAssetUri = savedAsset.uri ?? captured.uri;
        photoId = savedAsset.id;
      } catch {
        // Fall back to the captured file URI so the album action still succeeds.
      }

      const resolvedExistingId = findExistingPhotoId(photoId, savedAssetUri);
      const existing = resolvedExistingId ? photosMap.get(resolvedExistingId) : photosMap.get(photoId);
      const idToUse = resolvedExistingId ?? photoId;

      if (existing) {
        addAlbumToPhoto(idToUse, title);
        addPhotosToAlbum(id, [idToUse]);
        addPhotosToCustomAlbum(id, [idToUse]);
        if (customAlbumLocation) {
          updatePhotoEdits(idToUse, { location: customAlbumLocation });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showFeedback('Photo captured and added to this album.', 'success');
        return;
      }

      const creationDate = await resolveCreationDate(photoId, Date.now());
      const year = creationDate.getFullYear().toString();
      const uniqueAlbums = Array.from(new Set([title, year]));

      const newPhoto: PhotoWithUri = {
        id: photoId,
        title: captured.fileName || photoId,
        date: creationDate,
        location: customAlbumLocation || '',
        albums: uniqueAlbums,
        uri: savedAssetUri,
      };

      addPhotos([newPhoto]);
      addPhotosToAlbum(id, [photoId]);
      addPhotosToCustomAlbum(id, [photoId]);
      getOrCreateYearlyAlbum(year);
      addPhotoToYearlyAlbum(year, photoId);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showFeedback('Photo captured and added to this album.', 'success');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      showFeedback(`Could not capture photo. ${errorMessage}`, 'error');
    } finally {
      setIsImporting(false);
    }
  }, [id, title, customAlbumLocation, photosMap, findExistingPhotoId, resolveCreationDate, addAlbumToPhoto, addPhotosToAlbum, addPhotosToCustomAlbum, updatePhotoEdits, addPhotos, getOrCreateYearlyAlbum, addPhotoToYearlyAlbum, showFeedback]);

  const handleDeleteAlbum = useCallback(() => {
    if (!id || !title) return;

    // Delete the album from store
    deleteCustomAlbum(id);

    // Remove album reference from all photos
    removeAlbumFromAllPhotos(title);

    // Close modals and navigate back
    setShowDeleteConfirm(false);
    router.back();
  }, [id, title, deleteCustomAlbum, removeAlbumFromAllPhotos, router]);

  const renderItem = useCallback(
    ({ item, index }: { item: Photo; index: number }) => (
      <PhotoCard
        photo={item}
        isDark={isDark}
        index={index}
        onPress={() => handlePhotoPress(item, index)}
      />
    ),
    [isDark, handlePhotoPress]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#2563EB'} />
      </View>
    );
  }, [isFetchingNextPage, isDark]);

  return (
    <>
      <Stack.Screen
        options={{
          title: title ?? 'Album',
          headerStyle: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
          },
          headerTintColor: isDark ? '#F9FAFB' : '#111827',
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              className="active:opacity-60 mr-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={28} color={isDark ? '#F9FAFB' : '#111827'} />
            </Pressable>
          ),
          headerRight: isCustomAlbum
            ? () => (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowOptionsMenu(true);
                  }}
                  disabled={isImporting}
                  className="active:opacity-60 ml-2"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MoreVertical size={24} color={isDark ? '#F9FAFB' : '#111827'} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <View
        className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
        style={styles.container}
      >
        {/* Comic book style background pattern */}
        <View
          style={[
            styles.bgPattern,
            { backgroundColor: isDark ? '#0F172A' : '#F3F4F6' },
          ]}
        />

        {(isLoading && !isYearlyAlbum && !isPreloaded) || (isCustomAlbum && isLoadingCustomPhotos && photos.length === 0) ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#2563EB'} />
            <Text className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Loading photos...
            </Text>
          </View>
        ) : photos.length === 0 ? (
          <EmptyState
            isDark={isDark}
            isCustom={isCustomAlbum}
            onAddFromGallery={isCustomAlbum ? handleAddFromGallery : undefined}
            onTakePhoto={isCustomAlbum ? handleTakePhoto : undefined}
            disabled={isImporting}
          />
        ) : (
          <FlashList
            data={photos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={COLUMN_COUNT}
            estimatedItemSize={ITEM_WIDTH * 1.1 + GAP}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        )}

        {isCustomAlbum && (
          <View className="px-4 pb-4 pt-1">
            <View className={`rounded-2xl px-4 py-3.5 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <View className="flex-row items-start">
                <Check size={16} color={isDark ? '#60A5FA' : '#2563EB'} style={{ marginTop: 2 }} />
                <Text className={`ml-2 text-[12px] leading-5 flex-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Album location applies to current photos and future photos added to this album.
                </Text>
              </View>
              {customAlbumLocation ? (
                <Text className={`text-xs mt-2.5 pl-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Current album location: {customAlbumLocation}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* Options menu - only for custom albums */}
      <OptionsMenu
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        onAddFromGallery={handleAddFromGallery}
        onTakePhoto={handleTakePhoto}
        onEditLocation={handleEditLocation}
        onDelete={() => {
          setShowOptionsMenu(false);
          setTimeout(() => setShowDeleteConfirm(true), 300);
        }}
        isDark={isDark}
      />

      <LocationModal
        visible={showLocationModal}
        isDark={isDark}
        initialValue={customAlbumLocation}
        onClose={() => setShowLocationModal(false)}
        onSave={handleSaveAlbumLocation}
        isSaving={isSavingLocation}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        visible={showDeleteConfirm}
        albumTitle={title ?? ''}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAlbum}
        isDark={isDark}
      />

      {isImporting && (
        <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View className={`rounded-2xl px-6 py-5 min-w-[220px] ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#2563EB'} />
            <Text className={`mt-3 text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {busyLabel}
            </Text>
          </View>
        </View>
      )}

      {feedback ? (
        <View className="absolute left-4 right-4 top-24">
          <View
            className={`rounded-xl px-4 py-3 ${
              feedback.type === 'success'
                ? isDark
                  ? 'bg-emerald-900/95'
                  : 'bg-emerald-100'
                : isDark
                ? 'bg-red-900/95'
                : 'bg-red-100'
            }`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              className={`text-sm font-medium ${
                feedback.type === 'success'
                  ? isDark
                    ? 'text-emerald-100'
                    : 'text-emerald-800'
                  : isDark
                  ? 'text-red-100'
                  : 'text-red-800'
              }`}
            >
              {feedback.message}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  listContent: {
    padding: GAP,
  },
  photoContainer: {
    alignItems: 'center',
  },
  frame: {
    padding: FRAME_WIDTH,
    borderWidth: 2,
    borderRadius: 4,
    // Comic book shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 5,
  },
  innerFrame: {
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

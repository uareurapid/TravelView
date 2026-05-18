import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Dimensions, Modal, TextInput, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as MediaLibrary from 'expo-media-library';
import { useColorScheme } from '@/lib/useColorScheme';
import { Images, Lock, X, FolderPlus, Calendar } from 'lucide-react-native';
import useAlbumStore from '@/lib/state/album-store';
import usePhotoStore from '@/lib/state/photo-store';
import { Album as AlbumModel } from '@/lib/models/album';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { backgroundPhotoLoader } from '@/lib/services/background-photo-loader';
import BackgroundLoadingIndicator from '@/components/BackgroundLoadingIndicator';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = 12;
const ITEM_WIDTH = (width - GAP * 3) / COLUMN_COUNT;

interface Album {
  id: string;
  title: string;
  assetCount: number;
  thumbnail: string | null;
  isCustom?: boolean;
  isYearAlbum?: boolean;
}

async function fetchAlbums(): Promise<Album[]> {
  const { status } = await MediaLibrary.requestPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('PERMISSION_DENIED');
  }

  const albums = await MediaLibrary.getAlbumsAsync({
    includeSmartAlbums: true,
  });

  const albumsWithThumbnails = await Promise.all(
    albums.map(async (album) => {
      let thumbnail: string | null = null;

      if (album.assetCount > 0) {
        const assets = await MediaLibrary.getAssetsAsync({
          album: album.id,
          first: 1,
          sortBy: [MediaLibrary.SortBy.creationTime],
          mediaType: [MediaLibrary.MediaType.photo],
        });

        if (assets.assets.length > 0) {
          thumbnail = assets.assets[0].uri;
        }
      }

      return {
        id: album.id,
        title: album.title,
        assetCount: album.assetCount,
        thumbnail,
      };
    })
  );

  return albumsWithThumbnails.filter((album) => album.assetCount > 0);
}

function AlbumCard({ album, isDark, onPress }: { album: Album; isDark: boolean; onPress: () => void }) {
  return (
    <Pressable
      className="active:opacity-80"
      style={{ width: ITEM_WIDTH, marginBottom: GAP }}
      onPress={onPress}
    >
      <View
        className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
        style={{ width: ITEM_WIDTH, height: ITEM_WIDTH }}
      >
        {album.thumbnail ? (
          <Image
            source={{ uri: album.thumbnail }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            {album.isYearAlbum ? (
              <Calendar
                size={40}
                color={isDark ? '#F59E0B' : '#D97706'}
              />
            ) : album.isCustom ? (
              <FolderPlus
                size={40}
                color={isDark ? '#60A5FA' : '#2563EB'}
              />
            ) : (
              <Images
                size={40}
                color={isDark ? '#4B5563' : '#9CA3AF'}
              />
            )}
          </View>
        )}
      </View>
      <View className="mt-2 px-1">
        <Text
          className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
          numberOfLines={1}
        >
          {album.title}
        </Text>
        <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {album.assetCount} {album.assetCount === 1 ? 'photo' : 'photos'}
        </Text>
      </View>
    </Pressable>
  );
}

function PermissionDenied({ isDark }: { isDark: boolean }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${
          isDark ? 'bg-gray-800' : 'bg-gray-100'
        }`}
      >
        <Lock size={36} color={isDark ? '#60A5FA' : '#2563EB'} />
      </View>
      <Text
        className={`text-xl font-bold text-center mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        Photo Access Required
      </Text>
      <Text
        className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
      >
        Please grant access to your photos in Settings to view your albums.
      </Text>
    </View>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${
          isDark ? 'bg-gray-800' : 'bg-gray-100'
        }`}
      >
        <Images size={36} color={isDark ? '#60A5FA' : '#2563EB'} />
      </View>
      <Text
        className={`text-xl font-bold text-center mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        No Albums Found
      </Text>
      <Text
        className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
      >
        Take some photos and they'll appear here organized by album.
      </Text>
    </View>
  );
}

interface CreateAlbumModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateAlbum: (name: string) => void;
  existingAlbums: Album[];
  isDark: boolean;
}

function CreateAlbumModal({ visible, onClose, onCreateAlbum, existingAlbums, isDark }: CreateAlbumModalProps) {
  const [albumName, setAlbumName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    const trimmedName = albumName.trim();

    if (!trimmedName) {
      setError('Please enter an album name');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const exists = existingAlbums.some(
      (album) => album.title.toLowerCase() === trimmedName.toLowerCase()
    );

    if (exists) {
      setError('An album with this name already exists');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreateAlbum(trimmedName);
    setAlbumName('');
    setError(null);
    onClose();
  };

  const handleClose = () => {
    setAlbumName('');
    setError(null);
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onPress={handleClose}
      >
        <Pressable
          className={`mx-6 w-[85%] max-w-sm rounded-2xl p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
          onPress={() => {}}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text
              className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              New Album
            </Text>
            <Pressable
              onPress={handleClose}
              className="active:opacity-60"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>
          </View>

          <Text
            className={`text-sm mb-2 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Album Name
          </Text>
          <TextInput
            value={albumName}
            onChangeText={(text) => {
              setAlbumName(text);
              if (error) setError(null);
            }}
            placeholder="Enter album name"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            autoFocus
            className={`px-4 py-3 rounded-xl text-base ${
              isDark
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-900'
            } ${error ? 'border border-red-500' : ''}`}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          {error && (
            <Text className="text-red-500 text-sm mt-2">{error}</Text>
          )}

          <View className="flex-row mt-6 gap-3">
            <Pressable
              onPress={handleClose}
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
              onPress={handleCreate}
              className={`flex-1 py-3 rounded-xl items-center active:opacity-80 ${
                albumName.trim()
                  ? 'bg-blue-500'
                  : isDark
                  ? 'bg-gray-700'
                  : 'bg-gray-200'
              }`}
            >
              <Text
                className={`font-semibold ${
                  albumName.trim() ? 'text-white' : isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                Create
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AlbumsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();
  const router = useRouter();
  const backgroundLoadingStarted = useRef(false);

  const showCreateModal = useAlbumStore((s) => s.showCreateModal);
  const setShowCreateModal = useAlbumStore((s) => s.setShowCreateModal);
  const customAlbums = useAlbumStore((s) => s.customAlbums);
  const addCustomAlbum = useAlbumStore((s) => s.addCustomAlbum);
  const addAlbum = useAlbumStore((s) => s.addAlbum);
  const yearlyAlbumsMap = useAlbumStore((s) => s.yearlyAlbums);
  const getOrCreateYearlyAlbum = useAlbumStore((s) => s.getOrCreateYearlyAlbum);
  const photosMap = usePhotoStore((s) => s.photos);

  // Create current year album on mount
  useEffect(() => {
    const currentYear = new Date().getFullYear().toString();
    getOrCreateYearlyAlbum(currentYear);
  }, [getOrCreateYearlyAlbum]);

  const { data: deviceAlbums, isLoading, error } = useQuery({
    queryKey: ['albums'],
    queryFn: fetchAlbums,
    staleTime: 1000 * 60 * 5,
  });

  // Start background photo loading once device albums are loaded
  useEffect(() => {
    if (deviceAlbums && deviceAlbums.length > 0 && !backgroundLoadingStarted.current) {
      backgroundLoadingStarted.current = true;
      // Start background loading asynchronously (non-blocking)
      backgroundPhotoLoader.startBackgroundLoading();
    }
  }, [deviceAlbums]);

  // Save device albums to the album store when loaded
  useEffect(() => {
    if (deviceAlbums && deviceAlbums.length > 0) {
      deviceAlbums.forEach((album) => {
        if (!album.isCustom) {
          const albumModel: AlbumModel = {
            id: album.id,
            title: album.title || album.id,
            location: '',
            photoIds: [],
          };
          addAlbum(albumModel);
        }
      });
    }
  }, [deviceAlbums, addAlbum]);

  // Get yearly albums from store - memoized to prevent infinite loop
  const yearlyAlbumsFormatted: Album[] = useMemo(() => {
    const albums = Array.from(yearlyAlbumsMap.values());
    // Sort by year descending (newest first)
    const sorted = albums.sort((a, b) => parseInt(b.title) - parseInt(a.title));
    return sorted.map((album) => {
      // Get thumbnail from first photo in album
      let thumbnail: string | null = null;
      if (album.photoIds.length > 0) {
        const firstPhoto = photosMap.get(album.photoIds[0]);
        if (firstPhoto) {
          thumbnail = firstPhoto.uri;
        }
      }
      return {
        id: album.id,
        title: album.title,
        assetCount: album.photoIds.length,
        thumbnail,
        isYearAlbum: true,
      };
    });
  }, [yearlyAlbumsMap, photosMap]);

  // Combine device albums with custom albums
  const customAlbumsFormatted: Album[] = customAlbums.map((album) => {
    const albumPhotos = Array.from(photosMap.values())
      .filter((photo) => photo.albums.includes(album.title))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      id: album.id,
      title: album.title,
      assetCount: albumPhotos.length,
      thumbnail: albumPhotos[0]?.uri ?? null,
      isCustom: true,
    };
  });

  // Order: custom albums, yearly albums, device albums
  const allAlbums: Album[] = [...customAlbumsFormatted, ...yearlyAlbumsFormatted, ...(deviceAlbums ?? [])];

  const handleCreateAlbum = (name: string) => {
    addCustomAlbum(name);
  };

  const handleAlbumPress = useCallback((album: Album) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/album/[id]',
      params: {
        id: album.id,
        title: album.title,
        isCustom: album.isCustom ? 'true' : 'false',
        isYearAlbum: album.isYearAlbum ? 'true' : 'false',
      },
    });
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Album }) => (
      <AlbumCard
        album={item}
        isDark={isDark}
        onPress={() => handleAlbumPress(item)}
      />
    ),
    [isDark, handleAlbumPress]
  );

  if (isLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#2563EB'} />
        <Text className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Loading albums...
        </Text>
      </View>
    );
  }

  if (error?.message === 'PERMISSION_DENIED') {
    return (
      <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <PermissionDenied isDark={isDark} />
        <CreateAlbumModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateAlbum={handleCreateAlbum}
          existingAlbums={allAlbums}
          isDark={isDark}
        />
      </View>
    );
  }

  if (allAlbums.length === 0) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <EmptyState isDark={isDark} />
        <CreateAlbumModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateAlbum={handleCreateAlbum}
          existingAlbums={allAlbums}
          isDark={isDark}
        />
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <FlashList
        data={allAlbums}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        estimatedItemSize={ITEM_WIDTH + 60}
        contentContainerStyle={{ padding: GAP }}
        showsVerticalScrollIndicator={false}
      />
      <BackgroundLoadingIndicator />
      <CreateAlbumModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateAlbum={handleCreateAlbum}
        existingAlbums={allAlbums}
        isDark={isDark}
      />
    </View>
  );
}

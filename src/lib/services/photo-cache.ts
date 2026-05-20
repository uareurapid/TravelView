import * as FileSystem from 'expo-file-system';
import { PhotoWithUri } from '@/lib/state/photo-store';
import { Album } from '@/lib/models/album';

const CACHE_VERSION = 1;
const CACHE_FILE_PATH = `${FileSystem.documentDirectory}photo_cache_v${CACHE_VERSION}.json`;

interface SerializedPhoto {
  id: string;
  title: string;
  date: string; // ISO string
  location: string;
  albums: string[];
  uri: string;
}

export interface CacheData {
  version: number;
  savedAt: number;
  /** Serialized entries from the photos Map */
  photos: Array<[string, SerializedPhoto]>;
  /** albumId -> photoIds mapping */
  albumPhotoIds: Record<string, string[]>;
  /** albumId -> title mapping */
  albumTitles: Record<string, string>;
  /** year -> photoIds mapping for yearly albums */
  yearlyAlbumPhotoIds: Record<string, string[]>;
  /** Albums that were fully processed in the last run */
  loadedAlbumIds: string[];
  /** albumId -> assetCount at time of caching (used for change detection) */
  albumAssetCounts: Record<string, number>;
}

function serializePhoto(photo: PhotoWithUri): SerializedPhoto {
  const date = photo.date instanceof Date ? photo.date : new Date(photo.date as unknown as string);
  return {
    id: photo.id,
    title: photo.title,
    date: date.toISOString(),
    location: photo.location,
    albums: photo.albums,
    uri: photo.uri,
  };
}

function deserializePhoto(serialized: SerializedPhoto): PhotoWithUri {
  return {
    ...serialized,
    date: new Date(serialized.date),
  };
}

/**
 * Persist the current photo and album state to a JSON file on disk.
 * Uses expo-file-system so there is no size limit unlike AsyncStorage.
 */
export async function saveCache(
  photos: Map<string, PhotoWithUri>,
  albums: Map<string, Album>,
  yearlyAlbums: Map<string, Album>,
  loadedAlbumIds: Set<string>,
  albumAssetCounts: Record<string, number>
): Promise<void> {
  try {
    const albumPhotoIds: Record<string, string[]> = {};
    const albumTitles: Record<string, string> = {};
    albums.forEach((album, id) => {
      albumPhotoIds[id] = album.photoIds;
      albumTitles[id] = album.title;
    });

    const yearlyAlbumPhotoIds: Record<string, string[]> = {};
    yearlyAlbums.forEach((album, year) => {
      yearlyAlbumPhotoIds[year] = album.photoIds;
    });

    const data: CacheData = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      photos: Array.from(photos.entries()).map(([id, photo]) => [id, serializePhoto(photo)]),
      albumPhotoIds,
      albumTitles,
      yearlyAlbumPhotoIds,
      loadedAlbumIds: Array.from(loadedAlbumIds),
      albumAssetCounts,
    };

    await FileSystem.writeAsStringAsync(CACHE_FILE_PATH, JSON.stringify(data));
    console.log(`[PhotoCache] Saved: ${photos.size} photos, ${Object.keys(albumPhotoIds).length} albums`);
  } catch (error) {
    console.error('[PhotoCache] Save failed:', error);
  }
}

/**
 * Load the cached photo/album data from disk.
 * Returns null if the cache does not exist, is unreadable, or is a different version.
 */
export async function loadCache(): Promise<CacheData | null> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_FILE_PATH);
    if (!info.exists) return null;

    const json = await FileSystem.readAsStringAsync(CACHE_FILE_PATH);
    const data = JSON.parse(json) as CacheData;

    if (data.version !== CACHE_VERSION) {
      console.log('[PhotoCache] Version mismatch, ignoring cache');
      return null;
    }

    console.log(`[PhotoCache] Loaded: ${data.photos.length} photos, ${data.loadedAlbumIds.length} loaded albums`);
    return data;
  } catch (error) {
    console.error('[PhotoCache] Load failed:', error);
    return null;
  }
}

/** Convert raw serialized photo entries back to PhotoWithUri objects */
export function deserializeCachePhotos(data: CacheData): PhotoWithUri[] {
  return data.photos.map(([, photo]) => deserializePhoto(photo));
}

/** Delete the cache file (useful for debugging or forced refresh) */
export async function clearCache(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_FILE_PATH);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_FILE_PATH);
      console.log('[PhotoCache] Cleared');
    }
  } catch (error) {
    console.error('[PhotoCache] Clear failed:', error);
  }
}

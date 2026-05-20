import * as MediaLibrary from 'expo-media-library';
import useAlbumStore from '@/lib/state/album-store';
import usePhotoStore, { PhotoWithUri } from '@/lib/state/photo-store';
import { Album } from '@/lib/models/album';
import { loadCache, saveCache, deserializeCachePhotos, CacheData } from '@/lib/services/photo-cache';

const PAGE_SIZE = 50;

interface AlbumInfo {
  id: string;
  title: string;
  assetCount: number;
}

/**
 * Background photo loader service
 * Loads all photos from device albums in the background without blocking UI
 */
class BackgroundPhotoLoader {
  private isRunning = false;
  private abortController: AbortController | null = null;
  /** Asset counts per album at the time the cache was last saved — used for change detection */
  private cachedAlbumAssetCounts: Record<string, number> = {};

  /**
   * Start background loading of all album photos
   * Creates current year album first, then loads photos from all device albums
   */
  async startBackgroundLoading(): Promise<void> {
    if (this.isRunning) {
      console.log('[BackgroundLoader] Already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      console.log('[BackgroundLoader] Starting background photo loading...');

      // Step 1: Create current year album immediately
      const currentYear = new Date().getFullYear().toString();
      const { getOrCreateYearlyAlbum } = useAlbumStore.getState();
      getOrCreateYearlyAlbum(currentYear);
      console.log(`[BackgroundLoader] Created yearly album for ${currentYear}`);

      // Step 2: Hydrate stores from disk cache so photos appear immediately
      await this.hydrateFromCache();

      // Step 3: Get all device albums
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[BackgroundLoader] Permission denied');
        return;
      }

      const albums = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });

      // Filter to albums with photos
      const albumsWithPhotos: AlbumInfo[] = albums
        .filter((album) => album.assetCount > 0)
        .map((album) => ({
          id: album.id,
          title: album.title,
          assetCount: album.assetCount,
        }));

      console.log(`[BackgroundLoader] Found ${albumsWithPhotos.length} albums with photos`);

      // Step 4: Load only albums that are new or have changed since last cache
      let anyAlbumProcessed = false;
      for (const album of albumsWithPhotos) {
        if (this.abortController?.signal.aborted) {
          console.log('[BackgroundLoader] Aborted');
          break;
        }

        const { isAlbumLoaded, resetAlbumLoaded } = useAlbumStore.getState();
        const cachedCount = this.cachedAlbumAssetCounts[album.id];

        if (isAlbumLoaded(album.id) && cachedCount === album.assetCount) {
          // Album unchanged since last cache — skip entirely
          continue;
        }

        if (isAlbumLoaded(album.id)) {
          // Album changed (photos added or removed) — reset so it gets re-processed
          console.log(`[BackgroundLoader] Album "${album.title}" changed (${cachedCount} -> ${album.assetCount}), re-loading`);
          resetAlbumLoaded(album.id);
        }

        await this.loadAlbumPhotos(album);
        this.cachedAlbumAssetCounts[album.id] = album.assetCount;
        anyAlbumProcessed = true;

        // Small delay between albums to keep UI responsive
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Step 5: Save updated cache to disk if anything changed
      if (anyAlbumProcessed) {
        const { photos } = usePhotoStore.getState();
        const { albums, yearlyAlbums, loadedAlbumIds } = useAlbumStore.getState();
        await saveCache(photos, albums, yearlyAlbums, loadedAlbumIds, this.cachedAlbumAssetCounts);
      }

      // Mark loading as complete
      const { setBackgroundLoadingComplete } = useAlbumStore.getState();
      setBackgroundLoadingComplete(true);
      console.log('[BackgroundLoader] Background loading complete');

    } catch (error) {
      console.error('[BackgroundLoader] Error:', error);
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Load cached photo/album data from disk and hydrate the Zustand stores.
   * This makes photos available immediately on startup before the background
   * loader finishes its diff check.
   */
  private async hydrateFromCache(): Promise<void> {
    const cacheData: CacheData | null = await loadCache();
    if (!cacheData) return;

    const { addPhotos } = usePhotoStore.getState();
    const { addAlbum, addPhotosToAlbum, getOrCreateYearlyAlbum, addPhotosToYearlyAlbum, markAlbumAsLoaded } =
      useAlbumStore.getState();

    // Hydrate photo store
    const photos = deserializeCachePhotos(cacheData);
    if (photos.length > 0) {
      addPhotos(photos);
    }

    // Hydrate device album store
    Object.entries(cacheData.albumPhotoIds).forEach(([albumId, photoIds]) => {
      const title = cacheData.albumTitles[albumId] ?? albumId;
      addAlbum({ id: albumId, title, location: '', photoIds: [] });
      if (photoIds.length > 0) {
        addPhotosToAlbum(albumId, photoIds);
      }
    });

    // Hydrate yearly album store
    Object.entries(cacheData.yearlyAlbumPhotoIds).forEach(([year, photoIds]) => {
      getOrCreateYearlyAlbum(year);
      if (photoIds.length > 0) {
        addPhotosToYearlyAlbum(year, photoIds);
      }
    });

    // Restore which albums were already fully processed
    cacheData.loadedAlbumIds.forEach((albumId) => markAlbumAsLoaded(albumId));

    // Keep cached asset counts for diff detection in the album loop
    this.cachedAlbumAssetCounts = cacheData.albumAssetCounts;

    console.log(`[BackgroundLoader] Hydrated from cache: ${photos.length} photos, ${cacheData.loadedAlbumIds.length} loaded albums`);
  }

  /**
   * Load all photos from a single album
   */
  private async loadAlbumPhotos(albumInfo: AlbumInfo): Promise<void> {
    const { isAlbumLoaded, markAlbumAsLoaded, addAlbum, addPhotosToAlbum, getOrCreateYearlyAlbum, addPhotosToYearlyAlbum } = useAlbumStore.getState();
    const { addPhotos } = usePhotoStore.getState();

    // Skip if already loaded
    if (isAlbumLoaded(albumInfo.id)) {
      console.log(`[BackgroundLoader] Album "${albumInfo.title}" already loaded, skipping`);
      return;
    }

    console.log(`[BackgroundLoader] Loading album "${albumInfo.title}" (${albumInfo.assetCount} photos)`);

    // Ensure album exists in store
    const albumModel: Album = {
      id: albumInfo.id,
      title: albumInfo.title,
      location: '',
      photoIds: [],
    };
    addAlbum(albumModel);

    let cursor: string | undefined;
    let totalLoaded = 0;

    // Group photos by year for batch updates
    const photosByYear: Map<string, string[]> = new Map();
    const allPhotoIds: string[] = [];

    while (true) {
      if (this.abortController?.signal.aborted) break;

      const assets = await MediaLibrary.getAssetsAsync({
        album: albumInfo.id,
        first: PAGE_SIZE,
        after: cursor,
        sortBy: [MediaLibrary.SortBy.creationTime],
        mediaType: [MediaLibrary.MediaType.photo],
      });

      if (assets.assets.length === 0) break;

      // Process assets in batch
      const photoModels: PhotoWithUri[] = [];

      for (const asset of assets.assets) {
        const year = new Date(asset.creationTime).getFullYear().toString();

        // Get detailed info for location (do in parallel for performance)
        let location = '';
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
          if (assetInfo.location) {
            location = `${assetInfo.location.latitude},${assetInfo.location.longitude}`;
          }
        } catch {
          // Ignore location errors
        }

        const photoModel: PhotoWithUri = {
          id: asset.id,
          title: asset.filename || asset.id,
          date: new Date(asset.creationTime),
          location,
          albums: [albumInfo.title, year],
          uri: asset.uri,
        };

        photoModels.push(photoModel);
        allPhotoIds.push(asset.id);

        // Group by year
        if (!photosByYear.has(year)) {
          photosByYear.set(year, []);
        }
        photosByYear.get(year)!.push(asset.id);
      }

      // Batch add photos to store
      addPhotos(photoModels);
      totalLoaded += photoModels.length;

      // Check if there are more pages
      if (!assets.hasNextPage) break;
      cursor = assets.endCursor;

      // Small delay to keep UI responsive
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Batch update album with all photo IDs
    if (allPhotoIds.length > 0) {
      addPhotosToAlbum(albumInfo.id, allPhotoIds);
    }

    // Batch update yearly albums
    for (const [year, photoIds] of photosByYear) {
      getOrCreateYearlyAlbum(year);
      addPhotosToYearlyAlbum(year, photoIds);
    }

    // Mark album as loaded
    markAlbumAsLoaded(albumInfo.id);
    console.log(`[BackgroundLoader] Finished album "${albumInfo.title}": ${totalLoaded} photos loaded`);
  }

  /**
   * Stop background loading
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
  }

  /**
   * Check if background loading is running
   */
  isLoading(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const backgroundPhotoLoader = new BackgroundPhotoLoader();

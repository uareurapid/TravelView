import * as MediaLibrary from 'expo-media-library';
import useAlbumStore from '@/lib/state/album-store';
import usePhotoStore, { PhotoWithUri } from '@/lib/state/photo-store';
import { Album } from '@/lib/models/album';

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

      // Step 2: Get all device albums
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

      // Step 3: Load photos from each album in sequence (to avoid overwhelming the system)
      for (const album of albumsWithPhotos) {
        if (this.abortController?.signal.aborted) {
          console.log('[BackgroundLoader] Aborted');
          break;
        }

        await this.loadAlbumPhotos(album);

        // Small delay between albums to keep UI responsive
        await new Promise((resolve) => setTimeout(resolve, 100));
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

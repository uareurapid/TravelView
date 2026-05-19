import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Album } from "@/lib/models/album";

export interface CustomAlbum {
  id: string;
  title: string;
  createdAt: number;
  location: string;
  photoIds: string[];
}

interface AlbumStore {
  // Custom albums (user-created, persisted)
  customAlbums: CustomAlbum[];
  addCustomAlbum: (title: string) => CustomAlbum;
  deleteCustomAlbum: (id: string) => string | null; // Returns the title of deleted album or null
  getCustomAlbumById: (id: string) => CustomAlbum | undefined;
  setCustomAlbumLocation: (id: string, location: string) => void;
  getCustomAlbumLocation: (id: string) => string;
  addPhotosToCustomAlbum: (id: string, photoIds: string[]) => void;
  getCustomAlbumPhotoIds: (id: string) => string[];
  hasAlbumWithTitle: (title: string) => boolean;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;

  // Device albums tracking (not persisted - loaded from device)
  albums: Map<string, Album>;
  addAlbum: (album: Album) => void;
  getAlbum: (id: string) => Album | undefined;
  addPhotoToAlbum: (albumId: string, photoId: string) => void;
  addPhotosToAlbum: (albumId: string, photoIds: string[]) => void;

  // Yearly albums (not persisted - generated on app restart)
  yearlyAlbums: Map<string, Album>;
  getOrCreateYearlyAlbum: (year: string) => Album;
  addPhotoToYearlyAlbum: (year: string, photoId: string) => void;
  addPhotosToYearlyAlbum: (year: string, photoIds: string[]) => void;
  getYearlyAlbums: () => Album[];

  // Background loading tracking
  loadedAlbumIds: Set<string>;
  isAlbumLoaded: (albumId: string) => boolean;
  markAlbumAsLoaded: (albumId: string) => void;
  isBackgroundLoadingComplete: boolean;
  setBackgroundLoadingComplete: (complete: boolean) => void;

  // Browsed albums tracking (for map markers in "current_album" mode)
  browsedAlbumIds: Set<string>;
  markAlbumAsBrowsed: (albumId: string) => void;
  isAlbumBrowsed: (albumId: string) => boolean;
  getBrowsedAlbumIds: () => string[];
}

const useAlbumStore = create<AlbumStore>()(
  persist(
    (set, get) => ({
      // Custom albums
      customAlbums: [],
      showCreateModal: false,
      setShowCreateModal: (show: boolean) => set({ showCreateModal: show }),
      addCustomAlbum: (title: string) => {
        const newAlbum: CustomAlbum = {
          id: `custom-${Date.now()}`,
          title,
          createdAt: Date.now(),
          location: '',
          photoIds: [],
        };
        set({ customAlbums: [...get().customAlbums, newAlbum] });
        return newAlbum;
      },
      hasAlbumWithTitle: (title: string) => {
        return get().customAlbums.some(
          (album) => album.title.toLowerCase() === title.toLowerCase()
        );
      },
      getCustomAlbumById: (id: string) => {
        return get().customAlbums.find((album) => album.id === id);
      },
      setCustomAlbumLocation: (id: string, location: string) => {
        set((state) => ({
          customAlbums: state.customAlbums.map((album) =>
            album.id === id ? { ...album, location } : album
          ),
        }));
      },
      getCustomAlbumLocation: (id: string) => {
        return get().customAlbums.find((album) => album.id === id)?.location ?? '';
      },
      addPhotosToCustomAlbum: (id: string, photoIds: string[]) => {
        if (photoIds.length === 0) return;

        set((state) => ({
          customAlbums: state.customAlbums.map((album) => {
            if (album.id !== id) return album;

            const mergedIds = [...new Set([...album.photoIds, ...photoIds])];
            return {
              ...album,
              photoIds: mergedIds,
            };
          }),
        }));
      },
      getCustomAlbumPhotoIds: (id: string) => {
        return get().customAlbums.find((album) => album.id === id)?.photoIds ?? [];
      },
      deleteCustomAlbum: (id: string) => {
        const album = get().customAlbums.find((a) => a.id === id);
        if (!album) return null;
        const albumTitle = album.title;
        set({ customAlbums: get().customAlbums.filter((a) => a.id !== id) });
        return albumTitle;
      },

      // Device albums tracking
      albums: new Map(),

      addAlbum: (album: Album) => {
        set((state) => {
          const newAlbums = new Map(state.albums);
          // Merge photoIds if album already exists
          const existing = newAlbums.get(album.id);
          if (existing) {
            const mergedPhotoIds = [...new Set([...existing.photoIds, ...album.photoIds])];
            newAlbums.set(album.id, { ...album, photoIds: mergedPhotoIds });
          } else {
            newAlbums.set(album.id, album);
          }
          return { albums: newAlbums };
        });
      },

      getAlbum: (id: string) => {
        return get().albums.get(id);
      },

      addPhotoToAlbum: (albumId: string, photoId: string) => {
        set((state) => {
          const newAlbums = new Map(state.albums);
          const album = newAlbums.get(albumId);
          if (album && !album.photoIds.includes(photoId)) {
            newAlbums.set(albumId, {
              ...album,
              photoIds: [...album.photoIds, photoId],
            });
          }
          return { albums: newAlbums };
        });
      },

      addPhotosToAlbum: (albumId: string, photoIds: string[]) => {
        set((state) => {
          const newAlbums = new Map(state.albums);
          const album = newAlbums.get(albumId);
          if (album) {
            const mergedIds = [...new Set([...album.photoIds, ...photoIds])];
            newAlbums.set(albumId, { ...album, photoIds: mergedIds });
          }
          return { albums: newAlbums };
        });
      },

      // Yearly albums (not persisted - regenerated on app restart)
      yearlyAlbums: new Map(),

      getOrCreateYearlyAlbum: (year: string) => {
        const existing = get().yearlyAlbums.get(year);
        if (existing) return existing;

        const newAlbum: Album = {
          id: `year-${year}`,
          title: year,
          location: '',
          photoIds: [],
          isYearAlbum: true,
        };

        set((state) => {
          const newYearlyAlbums = new Map(state.yearlyAlbums);
          newYearlyAlbums.set(year, newAlbum);
          return { yearlyAlbums: newYearlyAlbums };
        });

        return get().yearlyAlbums.get(year) ?? newAlbum;
      },

      addPhotoToYearlyAlbum: (year: string, photoId: string) => {
        set((state) => {
          const newYearlyAlbums = new Map(state.yearlyAlbums);
          const album = newYearlyAlbums.get(year);
          if (album && !album.photoIds.includes(photoId)) {
            newYearlyAlbums.set(year, {
              ...album,
              photoIds: [...album.photoIds, photoId],
            });
          }
          return { yearlyAlbums: newYearlyAlbums };
        });
      },

      addPhotosToYearlyAlbum: (year: string, photoIds: string[]) => {
        set((state) => {
          const newYearlyAlbums = new Map(state.yearlyAlbums);
          const album = newYearlyAlbums.get(year);
          if (album) {
            const existingIds = new Set(album.photoIds);
            const newIds = photoIds.filter((id) => !existingIds.has(id));
            if (newIds.length > 0) {
              newYearlyAlbums.set(year, {
                ...album,
                photoIds: [...album.photoIds, ...newIds],
              });
            }
          }
          return { yearlyAlbums: newYearlyAlbums };
        });
      },

      getYearlyAlbums: () => {
        const albums = Array.from(get().yearlyAlbums.values());
        // Sort by year descending (newest first)
        return albums.sort((a, b) => parseInt(b.title) - parseInt(a.title));
      },

      // Background loading tracking
      loadedAlbumIds: new Set(),
      isBackgroundLoadingComplete: false,

      isAlbumLoaded: (albumId: string) => {
        return get().loadedAlbumIds.has(albumId);
      },

      markAlbumAsLoaded: (albumId: string) => {
        set((state) => {
          const newLoadedIds = new Set(state.loadedAlbumIds);
          newLoadedIds.add(albumId);
          return { loadedAlbumIds: newLoadedIds };
        });
      },

      setBackgroundLoadingComplete: (complete: boolean) => {
        set({ isBackgroundLoadingComplete: complete });
      },

      // Browsed albums tracking (for map markers in "current_album" mode)
      browsedAlbumIds: new Set(),

      markAlbumAsBrowsed: (albumId: string) => {
        set((state) => {
          const newBrowsedIds = new Set(state.browsedAlbumIds);
          newBrowsedIds.add(albumId);
          return { browsedAlbumIds: newBrowsedIds };
        });
      },

      isAlbumBrowsed: (albumId: string) => {
        return get().browsedAlbumIds.has(albumId);
      },

      getBrowsedAlbumIds: () => {
        return Array.from(get().browsedAlbumIds);
      },
    }),
    {
      name: "album-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist custom albums, not device albums (those are loaded fresh)
      partialize: (state) => ({ customAlbums: state.customAlbums }),
    }
  )
);

export default useAlbumStore;

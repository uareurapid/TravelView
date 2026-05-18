import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Photo } from "@/lib/models/photo";

/** Extended photo data with URI for display */
export interface PhotoWithUri extends Photo {
  uri: string;
}

/** User edits that should persist between app restarts */
export interface PhotoEdits {
  title?: string;
  location?: string;
}

interface PhotoStore {
  /** Map of photo id to Photo model for quick lookup */
  photos: Map<string, PhotoWithUri>;
  /** Map of photo id to user edits (persisted) */
  photoEdits: Record<string, PhotoEdits>;
  /** Add or update a photo in the store */
  addPhoto: (photo: PhotoWithUri) => void;
  /** Add multiple photos at once (more efficient) */
  addPhotos: (photos: PhotoWithUri[]) => void;
  /** Get a photo by id (merges with persisted edits) */
  getPhoto: (id: string) => PhotoWithUri | undefined;
  /** Update photo title and/or location (persisted) */
  updatePhotoEdits: (id: string, edits: PhotoEdits) => void;
  /** Apply same location edit to many photos (persisted) */
  updatePhotosLocation: (photoIds: string[], location: string) => void;
  /** Get all photos with GPS location (includes persisted edits) */
  getPhotosWithLocation: () => PhotoWithUri[];
  /** Get all persisted photo edits with location */
  getPersistedPhotosWithLocation: () => Array<{ id: string; edits: PhotoEdits }>;
  /** Add an album reference to a photo */
  addAlbumToPhoto: (photoId: string, albumTitle: string) => void;
  /** Remove an album reference from all photos */
  removeAlbumFromAllPhotos: (albumTitle: string) => void;
  /** Clear all photos */
  clearPhotos: () => void;
}

/** Helper to merge photo with persisted edits */
function mergePhotoWithEdits(photo: PhotoWithUri, edits?: PhotoEdits): PhotoWithUri {
  if (!edits) return photo;
  return {
    ...photo,
    title: edits.title ?? photo.title,
    location: edits.location ?? photo.location,
  };
}

const usePhotoStore = create<PhotoStore>()(
  persist(
    (set, get) => ({
      photos: new Map(),
      photoEdits: {},

      addPhoto: (photo: PhotoWithUri) => {
        set((state) => {
          const newPhotos = new Map(state.photos);
          // Merge with any existing edits
          const edits = state.photoEdits[photo.id];
          const mergedPhoto = mergePhotoWithEdits(photo, edits);
          newPhotos.set(photo.id, mergedPhoto);
          return { photos: newPhotos };
        });
      },

      addPhotos: (photos: PhotoWithUri[]) => {
        set((state) => {
          const newPhotos = new Map(state.photos);
          photos.forEach((photo) => {
            // Merge with any existing edits
            const edits = state.photoEdits[photo.id];
            const mergedPhoto = mergePhotoWithEdits(photo, edits);
            newPhotos.set(photo.id, mergedPhoto);
          });
          return { photos: newPhotos };
        });
      },

      getPhoto: (id: string) => {
        const state = get();
        const photo = state.photos.get(id);
        if (!photo) return undefined;
        // Return photo merged with persisted edits
        return mergePhotoWithEdits(photo, state.photoEdits[id]);
      },

      updatePhotoEdits: (id: string, edits: PhotoEdits) => {
        set((state) => {
          const newPhotos = new Map(state.photos);
          const existingPhoto = newPhotos.get(id);
          const existingEdits = state.photoEdits[id] || {};
          const newEdits = { ...existingEdits, ...edits };

          // Update in-memory photo if it exists
          if (existingPhoto) {
            const mergedPhoto = mergePhotoWithEdits(existingPhoto, newEdits);
            newPhotos.set(id, mergedPhoto);
          }

          return {
            photos: newPhotos,
            photoEdits: {
              ...state.photoEdits,
              [id]: newEdits,
            },
          };
        });
      },

      updatePhotosLocation: (photoIds: string[], location: string) => {
        if (photoIds.length === 0) return;

        set((state) => {
          const newPhotos = new Map(state.photos);
          const newPhotoEdits = { ...state.photoEdits };

          photoIds.forEach((id) => {
            const existingPhoto = newPhotos.get(id);
            const existingEdits = newPhotoEdits[id] || {};
            const mergedEdits = {
              ...existingEdits,
              location: location || undefined,
            };

            newPhotoEdits[id] = mergedEdits;

            if (existingPhoto) {
              const mergedPhoto = mergePhotoWithEdits(existingPhoto, mergedEdits);
              newPhotos.set(id, mergedPhoto);
            }
          });

          return {
            photos: newPhotos,
            photoEdits: newPhotoEdits,
          };
        });
      },

      getPhotosWithLocation: () => {
        const state = get();
        const result: PhotoWithUri[] = [];
        state.photos.forEach((photo) => {
          const edits = state.photoEdits[photo.id];
          const mergedPhoto = mergePhotoWithEdits(photo, edits);
          // Check if location is a valid GPS coordinate or location name
          if (mergedPhoto.location && mergedPhoto.location.length > 0) {
            result.push(mergedPhoto);
          }
        });
        return result;
      },

      getPersistedPhotosWithLocation: () => {
        const state = get();
        const result: Array<{ id: string; edits: PhotoEdits }> = [];
        Object.entries(state.photoEdits).forEach(([id, edits]) => {
          if (edits.location && edits.location.length > 0) {
            result.push({ id, edits });
          }
        });
        return result;
      },

      addAlbumToPhoto: (photoId: string, albumTitle: string) => {
        set((state) => {
          const newPhotos = new Map(state.photos);
          const photo = newPhotos.get(photoId);
          if (photo && !photo.albums.includes(albumTitle)) {
            newPhotos.set(photoId, {
              ...photo,
              albums: [...photo.albums, albumTitle],
            });
          }
          return { photos: newPhotos };
        });
      },

      removeAlbumFromAllPhotos: (albumTitle: string) => {
        set((state) => {
          const newPhotos = new Map(state.photos);
          newPhotos.forEach((photo, id) => {
            if (photo.albums.includes(albumTitle)) {
              newPhotos.set(id, {
                ...photo,
                albums: photo.albums.filter((a) => a !== albumTitle),
              });
            }
          });
          return { photos: newPhotos };
        });
      },

      clearPhotos: () => {
        set({ photos: new Map() });
      },
    }),
    {
      name: "photo-edits-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the user edits, not the full photo data
      partialize: (state) => ({ photoEdits: state.photoEdits }),
    }
  )
);

export default usePhotoStore;

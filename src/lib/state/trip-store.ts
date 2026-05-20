import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TripStore {
  /** Custom names keyed by trip ID */
  customNames: Record<string, string>;
  setTripName: (tripId: string, name: string) => void;
  getTripName: (tripId: string) => string | undefined;
}

const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      customNames: {},

      setTripName: (tripId, name) =>
        set((state) => ({
          customNames: { ...state.customNames, [tripId]: name },
        })),

      getTripName: (tripId) => get().customNames[tripId],
    }),
    {
      name: 'trip-names-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useTripStore;

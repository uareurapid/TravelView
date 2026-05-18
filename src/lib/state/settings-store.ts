import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MapMarkerMode = "current_album" | "all_albums";

interface SettingsStore {
  // Map marker display mode
  mapMarkerMode: MapMarkerMode;
  setMapMarkerMode: (mode: MapMarkerMode) => void;
}

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      mapMarkerMode: "current_album", // Default to current album only
      setMapMarkerMode: (mode: MapMarkerMode) => set({ mapMarkerMode: mode }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;

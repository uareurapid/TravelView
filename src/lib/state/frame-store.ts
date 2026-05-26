import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SLOT_COUNT = 6;

interface FrameStore {
  /** 6 photo URIs — null means the slot is empty */
  slots: (string | null)[];
  setSlot: (index: number, uri: string) => void;
  clearSlot: (index: number) => void;
}

const useFrameStore = create<FrameStore>()(
  persist(
    (set) => ({
      slots: Array<null>(SLOT_COUNT).fill(null),
      setSlot: (index, uri) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = uri;
          return { slots };
        }),
      clearSlot: (index) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = null;
          return { slots };
        }),
    }),
    {
      name: 'frame-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useFrameStore;

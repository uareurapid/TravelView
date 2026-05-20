import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PurchasesStore {
  isPremium: boolean;
  setPremium: (value: boolean) => void;
}

const usePurchasesStore = create<PurchasesStore>()(
  persist(
    (set) => ({
      isPremium: false,
      setPremium: (value: boolean) => set({ isPremium: value }),
    }),
    {
      name: 'purchases-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default usePurchasesStore;

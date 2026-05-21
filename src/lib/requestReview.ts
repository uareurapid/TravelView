type StoreReviewModule = {
  isAvailableAsync: () => Promise<boolean>;
  requestReview: () => Promise<void>;
};

function getStoreReviewModule(): StoreReviewModule | null {
  try {
    const mod = require('expo-store-review') as Partial<StoreReviewModule> | undefined;
    if (!mod) return null;
    if (typeof mod.isAvailableAsync !== 'function') return null;
    if (typeof mod.requestReview !== 'function') return null;
    return mod as StoreReviewModule;
  } catch {
    return null;
  }
}

/**
 * Asks the OS to show a native app-review prompt after a short delay.
 * The delay ensures any React Native modals or animations have fully settled
 * before the native review sheet appears (avoids dismissal conflicts).
 * iOS/Android throttle how often the prompt actually shows — this is by design.
 */
export function requestAppReview(): void {
  setTimeout(() => {
    void (async () => {
      const storeReview = getStoreReviewModule();
      if (!storeReview) return;

      try {
        if (await storeReview.isAvailableAsync()) {
          await storeReview.requestReview();
        }
      } catch {
        // Never let a review prompt crash the app
      }
    })();
  }, 900);
}

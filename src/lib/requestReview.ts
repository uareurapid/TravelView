import * as StoreReview from 'expo-store-review';

/**
 * Asks the OS to show a native app-review prompt.
 * iOS/Android throttle how often they actually display it — this is by design.
 * Safe to call after meaningful user actions; silently no-ops when unavailable.
 */
export async function requestAppReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync() && await StoreReview.hasAction()) {
      await StoreReview.requestReview();
    }
  } catch {
    // Never let a review prompt crash the app
  }
}

/**
 * RevenueCat client for MyPhotoMap.
 *
 * Reads EXPO_PUBLIC_REVENUECAT_API_KEY from .env.
 * Initialises the SDK once on module import.
 * All exported functions return a typed result so callers never need
 * to catch exceptions.
 *
 * Entitlement identifier: "premium"
 * Lifetime package identifier: "$rc_lifetime"
 */

import { Platform } from 'react-native';
//import { FORCE_PREMIUM } from "./cn";
import Purchases, {
  type PurchasesOfferings,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

const isWeb = Platform.OS === 'web';
const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const isEnabled = !!apiKey && !isWeb;

const LOG = '[Purchases]';

export type PurchasesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error?: unknown };

async function guard<T>(
  action: string,
  fn: () => Promise<T>,
): Promise<PurchasesResult<T>> {
  if (!isEnabled) {
    console.log(`${LOG} ${action} skipped: not configured`);
    return { ok: false };
  }
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    console.log(`${LOG} ${action} failed:`, error);
    return { ok: false, error };
  }
}

// --- Initialise SDK on module load ---
if (isEnabled) {
  try {
    Purchases.setLogHandler((logLevel, message) => {
      if (logLevel === Purchases.LOG_LEVEL.ERROR) {
        console.log(LOG, message);
      }
    });
    Purchases.configure({ apiKey: apiKey! });
    console.log(`${LOG} SDK initialised`);
  } catch (err) {
    console.error(`${LOG} Init failed:`, err);
  }
}

// --- Public API ---

export const isPurchasesEnabled = (): boolean => isEnabled;

export const getOfferings = (): Promise<PurchasesResult<PurchasesOfferings>> =>
  guard('getOfferings', () => Purchases.getOfferings());

export const getCustomerInfo = (): Promise<PurchasesResult<CustomerInfo>> =>
  guard('getCustomerInfo', () => Purchases.getCustomerInfo());

export const purchasePackage = (
  pkg: PurchasesPackage,
): Promise<PurchasesResult<CustomerInfo>> =>
  guard('purchasePackage', async () => {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  });

export const restorePurchases = (): Promise<PurchasesResult<CustomerInfo>> =>
  guard('restorePurchases', () => Purchases.restorePurchases());

/** Returns true if the user has an active "premium" entitlement. */
export const checkPremiumEntitlement = async (): Promise<boolean> => {

// DEV: override — bypasses RevenueCat for simulator testing
  // if (FORCE_PREMIUM) {
  //   console.log(`[RevenueCat] FORCE_PREMIUM is ON — returning premium=true for "premium"`);
  //   return true;
  // }
  const result = await getCustomerInfo();
  if (!result.ok) return false;
  return !!result.data.entitlements.active['premium'];
};

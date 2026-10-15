import { Platform } from 'react-native';
import {
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_IOS_API_KEY,
  PREMIUM_ENTITLEMENT_ID,
} from './config';

/**
 * Thin wrapper around RevenueCat.
 *
 * - With API keys set (in a real build), it talks to the App Store / Google Play.
 * - Without keys (or on web), it runs in "test mode": in development builds the
 *   unlock button works locally so you can try premium themes; in a release
 *   build without keys, buying is disabled with a clear message.
 */

type PurchasesModule = typeof import('react-native-purchases').default;
type PurchasesPackage = import('react-native-purchases').PurchasesPackage;
type CustomerInfo = import('react-native-purchases').CustomerInfo;

let Purchases: PurchasesModule | null = null;
let premiumPackage: PurchasesPackage | null = null;

const apiKey = Platform.select({
  ios: REVENUECAT_IOS_API_KEY,
  android: REVENUECAT_ANDROID_API_KEY,
  default: '',
});

export const storeAvailable = Platform.OS !== 'web' && !!apiKey;
export const isTestMode = !storeAvailable;
/**
 * In test mode, may the Unlock button unlock premium themes for free?
 * True in development, and in test APKs built with EXPO_PUBLIC_ALLOW_TEST_UNLOCK=1.
 * Store builds have real keys, so this never applies to them.
 */
export const allowTestUnlock =
  isTestMode && (__DEV__ || process.env.EXPO_PUBLIC_ALLOW_TEST_UNLOCK === '1');

function hasPremium(info: CustomerInfo): boolean {
  return info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
}

export type StoreState = { premium: boolean; priceLabel: string | null };

/** Configure the SDK and return the current premium status and price. */
export async function initStore(
  onChange: (premium: boolean) => void,
): Promise<StoreState> {
  if (!storeAvailable) return { premium: false, priceLabel: null };
  try {
    Purchases = require('react-native-purchases').default as PurchasesModule;
    Purchases.configure({ apiKey: apiKey! });
    Purchases.addCustomerInfoUpdateListener((info) => onChange(hasPremium(info)));

    const [info, offerings] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);
    premiumPackage = offerings.current?.availablePackages[0] ?? null;
    return {
      premium: hasPremium(info),
      priceLabel: premiumPackage?.product.priceString ?? null,
    };
  } catch (e) {
    console.warn('Store init failed', e);
    return { premium: false, priceLabel: null };
  }
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable' | 'error';

export async function buyPremium(): Promise<PurchaseResult> {
  if (!storeAvailable) return allowTestUnlock ? 'purchased' : 'unavailable';
  if (!Purchases || !premiumPackage) return 'unavailable';
  try {
    const { customerInfo } = await Purchases.purchasePackage(premiumPackage);
    return hasPremium(customerInfo) ? 'purchased' : 'error';
  } catch (e: any) {
    if (e?.userCancelled) return 'cancelled';
    console.warn('Purchase failed', e);
    return 'error';
  }
}

/** Required by Apple: lets people get premium back on a new phone. */
export async function restorePremium(): Promise<boolean | null> {
  if (!storeAvailable || !Purchases) return null;
  try {
    return hasPremium(await Purchases.restorePurchases());
  } catch (e) {
    console.warn('Restore failed', e);
    return null;
  }
}

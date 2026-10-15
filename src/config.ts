/**
 * App configuration — fill these in before publishing.
 *
 * In-app purchases use RevenueCat (free up to a revenue threshold), which
 * handles both the App Store and Google Play with one API.
 * See PUBLISHING.md, step 4, for how to get these keys.
 */
export const REVENUECAT_IOS_API_KEY = ''; // starts with "appl_"
export const REVENUECAT_ANDROID_API_KEY = ''; // starts with "goog_"

/** The entitlement identifier you create in RevenueCat. */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/** Shown on the unlock button until the real store price loads. */
export const FALLBACK_PRICE_LABEL = '$1.99';

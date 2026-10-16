# Publishing Guide — App Store & Google Play

Work through these steps in order. You do **not** need a Mac — Expo's cloud service (EAS) builds the iOS app for you.

---

## 1. Accounts you need

| Account | Cost | Link |
|---|---|---|
| Expo (EAS builds) | Free tier is enough to start | https://expo.dev/signup |
| Apple Developer Program | $99 / year | https://developer.apple.com/programs/ |
| Google Play Console | $25 one-time | https://play.google.com/console/signup |
| RevenueCat (in-app purchases) | Free until you reach a revenue threshold | https://www.revenuecat.com |

> Apple and Google may take a few days to verify a new developer account (especially an organization account, which needs a D-U-N-S number). Start these first.
>
> New **personal** Google Play accounts must run a closed test with a group of testers for a period before publishing to production — check the current requirement in Play Console.

---

## 2. Choose the app name and IDs

In `app.json`:

- `expo.name` — the name under the icon (currently **Dice Roller**). Store names must be unique, so check availability first.
- `expo.android.package` — `com.ash.diceroller` (matches the app created in Play Console). `expo.ios.bundleIdentifier` — `com.hostreadyllc.diceroll`. **These can never change after publishing.**

---

## 3. Create the app in each store

**App Store Connect** (https://appstoreconnect.apple.com) → Apps → **+ New App** → use the bundle ID above.

**Google Play Console** → **Create app** → fill in name, language, "App", "Free".

---

## 4. Set up the premium themes purchase

### 4a. Create the product in each store

Create a **one-time (non-consumable)** in-app product with the same ID in both stores:

- Product ID: `premium_themes`
- Price: e.g. **$1.99**
- Name: "Premium Themes" — Description: "Unlock all 8 premium dice themes."

App Store Connect → your app → **Monetization → In-App Purchases** → Non-Consumable.
Play Console → your app → **Monetize → Products → In-app products** (you may need to upload a first build before this section unlocks — see step 6).

> Apple also requires the **Paid Apps agreement**, plus banking and tax info, under App Store Connect → Business before purchases work.

### 4b. Connect RevenueCat

1. Create a project in RevenueCat and add an **App Store** app and a **Play Store** app (it walks you through linking each store).
2. **Products**: import `premium_themes` from both stores.
3. **Entitlements**: create one called `premium` and attach both products.
4. **Offerings**: in the `default` offering, add a package (e.g. "Lifetime") containing the products.
5. **API keys**: copy the public **Apple** key (`appl_…`) and **Google** key (`goog_…`) into `src/config.ts`.

The app reads the real price from the store automatically.

---

## 5. One-time setup: let GitHub sign the Play version

The app's **upload key** is stored encrypted in `signing/upload-keystore.jks.enc`.
GitHub needs its password to build signed bundles:

1. On GitHub, open the repo → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. Name: `UPLOAD_KEYSTORE_PASSWORD` — Value: the upload key password you were given.
4. Click **Add secret**.

Keep a backup of the password and of `upload-keystore.jks` somewhere safe (a password manager).
If they're ever lost, Google can reset the upload key — see "Request upload key reset" in Play Console.

---

## 6. Build

Every push to `main` builds automatically. On the newest release (repo → **Releases**) you'll find:

| File | Use |
|---|---|
| `DiceRoller-PlayStore-v…-code….aab` | **Upload this to Google Play** |
| `DiceRoller-v…-build….apk` | Install directly on your phone for testing |

To build without changing code: repo → **Actions** → **Build Android APK** → **Run workflow**.

Each build gets a higher version code automatically, which Google Play requires for every upload.

**Upload to Google Play:** Play Console → your app → **Test and release** → **Testing** → **Internal testing**
(or Closed testing) → **Create new release** → upload the `.aab`. When asked, keep
**Play App Signing** turned on (Google manages the final signing key).

**iOS** builds still use EAS: `npx eas-cli@latest build --platform ios --profile production`.

---

## 7. Test purchases before going live

- **Android**: add your Gmail under Play Console → Settings → **License testing**, then install from an internal test track. Test purchases aren't charged.
- **iOS**: create a **Sandbox tester** in App Store Connect → Users and Access → Sandbox, then test through **TestFlight**.

Check that: buying unlocks the themes, closing and reopening keeps them unlocked, and **Restore purchases** works after reinstalling.

---

## 8. Submit

```bash
npx eas-cli@latest submit --platform ios
```

Then finish the store listing in each console:

| Item | Notes |
|---|---|
| Screenshots | iPhone 6.9" and Android phone sizes at minimum. Show a few different themes. |
| Short + full description | See draft below |
| App icon | Generated from `assets/icon.png` |
| Privacy policy URL | Host `PRIVACY.md` (e.g. GitHub Pages) and paste the link |
| Data safety (Google) / App Privacy (Apple) | The app collects no personal data. Purchase data is handled by Apple/Google and RevenueCat. |
| Content rating | Complete the questionnaire — no violence, gambling with real money, etc. |
| Category | Games → Board, or Utilities |

### Draft store description

> **Dice Roller — simple, beautiful dice for every game.**
>
> Roll up to 6 dice with satisfying sound and vibration. Shake your phone or tap to roll, hold any die between rolls, and see your total and history at a glance.
>
> • 1 to 6 dice
> • Shake to roll
> • Hold dice between rolls
> • Roll history and running total
> • Realistic rolling sound and haptics
> • 12 themes — including Neon Arcade, Gold Luxe, Galaxy and more
>
> Perfect for board games, Yahtzee, Ludo, backgammon, classroom games and quick decisions.

---

## 9. Updating the app later

Change `expo.version` in `app.json` (e.g. `1.0.0` → `1.1.0`), then repeat steps 6 and 8. Build numbers auto-increment.

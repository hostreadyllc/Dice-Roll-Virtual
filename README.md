# Dice Roller

A simple, polished dice app for iOS and Android, built with Expo (React Native).

## Features

- Roll 1–6 dice with a tumble animation
- Rolling sound effect and vibration (each can be turned off)
- Shake the phone to roll
- Tap a die to **hold** it between rolls (great for Yahtzee-style games)
- Running total and roll history
- 4 free themes + 8 premium themes, unlocked with a one-time in-app purchase
- Restore purchases, light/dark-friendly themes, settings saved on the device

## Project layout

| File | What it does |
|---|---|
| `App.tsx` | Main screen: dice, roll button, history, shake detection, sound and vibration |
| `src/Die.tsx` | One die with pips and the roll animation |
| `src/ThemeSheet.tsx` | Theme picker, premium unlock card and settings |
| `src/themes.ts` | All themes — add or edit colors here |
| `src/purchases.ts` | In-app purchase logic (RevenueCat) |
| `src/config.ts` | **Your store keys and fallback price go here** |
| `src/storage.ts` | Saves settings on the device |
| `assets/sounds/` | Roll and tap sound effects (original, royalty-free) |

## Run it on your phone

```bash
npm install
npx expo start
```

The app uses in-app purchases, so it needs a **development build** rather than Expo Go:

```bash
npx eas-cli@latest build --profile development --platform android   # or ios
```

Install the build on your phone, then run `npx expo start` and open the app.

You can also preview it in a browser with `npx expo start --web` (no vibration or shake there).

### Test mode

Until you add store keys in `src/config.ts`, the app runs in **test mode**: in development builds, the
"Unlock" button unlocks premium themes locally so you can try them. In release builds without keys,
buying is disabled.

## Publishing

See **[PUBLISHING.md](PUBLISHING.md)** for the full step-by-step guide.

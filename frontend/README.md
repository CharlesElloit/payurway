# PayMyBills

A React Native (Expo) recreation of the PayMyBills home screen: wallet balance,
bill timeline table, an animated bar chart, and an upcoming/paid bills list.

Built on **Expo SDK 54** (React 19.1 / React Native 0.81, New Architecture
enabled by default).

## Getting started

```bash
npm install
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR
code with the Expo Go app on your phone.

## Project structure

```
paymybills/
├── App.tsx                     # Entry point, wraps HomeScreen in SafeAreaProvider
├── src/
│   ├── screens/
│   │   └── HomeScreen.tsx      # Composes all sections of the home page
│   ├── components/
│   │   ├── GreetingHeader.tsx      # Avatar, "Hola, {name}", ID, notification bell
│   │   ├── WeekCalendarStrip.tsx   # Horizontally scrollable, selectable day cards
│   │   ├── HeroHeaderCard.tsx      # Gradient card wrapping greeting + calendar
│   │   ├── WalletBalanceCard.tsx   # Balance + up/down movements
│   │   ├── AddMoneyButton.tsx      # Pill CTA button with press animation
│   │   ├── BillTimelineTable.tsx   # June vs July comparison table
│   │   ├── AnimatedBarChart.tsx    # SVG bar chart, animates in on mount
│   │   ├── TabSwitcher.tsx         # Upcoming / Paid tabs with animated underline
│   │   ├── BillListItem.tsx        # Single bill row
│   │   └── BottomTabBar.tsx        # Bottom nav with center "Pay" scan button
│   ├── constants/
│   │   └── mockData.ts         # All sample data driving the screen
│   ├── theme/
│   │   ├── colors.ts            # Color palette (black bg + neon-lime accent)
│   │   └── typography.ts        # Font size/weight scale
│   └── utils/
│       ├── responsive.ts        # scale/moderateScale helpers for cross-device sizing
│       └── format.ts            # Currency formatting
├── app.json
├── package.json
├── babel.config.js
└── tsconfig.json
```

## Design notes

- **Responsive**: all spacing/font sizes run through `moderateScale`/`rf` in
  `src/utils/responsive.ts`, which scales relative to a 375-wide baseline but
  dampens growth on tablets, so the layout holds up on small phones (iPhone SE),
  standard phones, tall phones (Dynamic Island devices), and tablets. Safe area
  insets are respected via `react-native-safe-area-context`.
- **Chart animation**: `AnimatedBarChart` gives each bar its own
  `Animated.Value` and staggers a `Animated.timing` growth animation on mount
  (bars rise from the baseline), using `react-native-svg`'s `Rect` wrapped in
  `Animated.createAnimatedComponent`.
- **Reusability**: every visual block on the screen is its own component with
  a typed props interface, so sections can be reordered, reused, or swapped
  for live data without touching layout code in `HomeScreen.tsx`.
- **Data**: `src/constants/mockData.ts` is the single source of mock data.
  Swap this out for real API calls/state management (React Query, Redux, etc.)
  without needing to touch any component internals — components only consume
  props.

## Next steps if you continue building this

- Wire `AddMoneyButton`, `BottomTabBar`, and `BillListItem` `onPress` handlers
  to real navigation (e.g. React Navigation) and API calls.
- Replace the placeholder avatar URL with real user data / image picker.
- Add pull-to-refresh on the `ScrollView` in `HomeScreen.tsx`.

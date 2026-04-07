# BLACKBOX.md — Olty

## Project Overview

**Olty** is a gamified social platform for hobby fishermen, built as a mobile app targeting the Turkish market (Android-first, iOS planned for Phase 1 end). Users log catches, follow other anglers, earn XP/badges, and compete on leaderboards. The app is KVKK-compliant (Turkish data privacy law).

**Stack:** React Native 0.81 + Expo SDK 54 + TypeScript (strict) + Supabase (Auth, PostgreSQL, Storage, Realtime) + NativeWind v4 (Tailwind CSS) + Zustand + React Query + expo-router v6 (file-based routing).

**Package manager:** pnpm (enforced via `.npmrc`).

---

## Building and Running

```bash
pnpm install              # Install dependencies
pnpm start                # Expo dev server
pnpm android              # Run on Android emulator
pnpm ios                  # Run on iOS simulator
pnpm typecheck            # tsc --noEmit — run after every change
pnpm lint                 # ESLint (flat config, eslint-config-expo)
pnpm test                 # Jest via Expo
pnpm check-env            # Validate required env vars are set
```

### Environment Variables

Create `.env.local` (never commit):

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_ONESIGNAL_APP_ID=
EXPO_PUBLIC_CF_R2_PUBLIC_URL=
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
EXPO_PUBLIC_SENTRY_DSN=
```

Server-only secrets are managed via EAS Secrets (`SUPABASE_SERVICE_ROLE_KEY`, etc.).

### Supabase CLI

```bash
pnpm db:types             # Regenerate src/types/database.types.ts from Supabase schema
pnpm db:migrate           # Push migrations to Supabase
supabase functions deploy <name>   # Deploy Edge Functions
```

---

## Repo Structure

```
app/                       ← Expo Router file-based routing
├── (auth)/                ← Auth screens (login, register, onboarding)
├── (tabs)/                ← Main tab bar (feed, explore, log, notifications, profile)
├── catch/                 ← Catch detail & new catch modal
├── gear/                  ← Gear inventory
├── settings/              ← Settings screens
├── tournaments/           ← Tournament screens
├── posts/                 ← Post screens
├── profile/               ← Profile screens
├── locations/             ← Fishing location screens
├── admin/                 ← Admin panel
├── _layout.tsx            ← Root layout (providers, auth guard)
├── index.tsx              ← Splash / redirect
├── login.tsx, register.tsx, search.tsx, fish-id.tsx, etc.
src/
├── components/            ← Shared UI components (PascalCase.tsx)
├── hooks/                 ← Custom React hooks (useKebabCase.ts)
├── lib/                   ← Core utilities (supabase client, constants, analytics, sentry, deep links)
├── screens/               ← Full-screen views
├── services/              ← Supabase API calls (kebab-case.service.ts)
├── stores/                ← Zustand global state (useAuthStore, useNotificationStore, usePreferencesStore)
├── types/                 ← TypeScript types (database.types.ts is auto-generated — never edit manually)
└── utils/                 ← Helper functions
supabase/
├── migrations/            ← SQL migration files
├── functions/             ← Supabase Edge Functions
└── seed.sql               ← Badge definitions and reference data
assets/                    ← App icons, splash screens, images
scripts/                   ← Build/dev helper scripts (check-env, metro patch)
```

---

## Architecture

### State Management Flow

```
Supabase (source of truth)
  → React Query (server cache, background sync)
    → Zustand stores (UI state, auth session)
      → Component local state (ephemeral UI only)
```

### Key Stores
- `useAuthStore` — user session and profile
- `useNotificationStore` — notification state
- `usePreferencesStore` — user preferences

### Service Layer

All Supabase queries are isolated in `src/services/`. Never write Supabase queries directly in components. Key services:

- `auth.service.ts` — signIn, signUp, signOut, getSession
- `catches.service.ts` — createCatch, getFeed, getCatchById, deleteCatch
- `profiles.service.ts` — getProfile, updateProfile, searchUsers
- `social.service.ts` — follow, unfollow, likeCatch, unlikeCatch, getComments
- `gamification.service.ts` — awardXP, checkBadges, getLeaderboard
- `gear.service.ts` — gear CRUD
- `storage.service.ts` — photo upload/delete (Cloudflare R2 via Supabase Storage)
- `tournaments.service.ts` — tournament management
- `posts.service.ts` — post management
- `weather.service.ts` — weather data and fish activity score
- `fishId.service.ts` — fish identification
- `dailyGames.service.ts` — daily game features

### Database

PostgreSQL via Supabase with RLS enabled on all tables. Key tables: `profiles`, `catches`, `fish_species`, `follows`, `likes`, `comments`, `xp_transactions`, `badge_definitions`, `user_badges`, `gear_items`, `user_consents`.

Location privacy is critical: exact coordinates are stored encrypted, public feed uses `ST_SnapToGrid(location, 0.02)` to fuzz locations by ~2km.

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).

---

## Coding Standards

### TypeScript
- **Strict mode** enabled — `any` is forbidden, use `unknown` + type guards
- Explicit return types on all functions
- All Supabase data must use types from `src/types/database.types.ts` (auto-generated) or extended types in `src/types/app.types.ts`
- Prefer `interface` over `type` for extensibility

### Components
- Functional components with arrow functions
- Props interface defined at top of file
- Max 150 lines per component — split if longer
- Use `memo()` only for proven performance issues
- Use `expo-image` (never `<Image>` from React Native)

### File Naming
- Components: `PascalCase.tsx`
- Hooks: `useKebabCase.ts` (e.g., `useDebounce.ts`)
- Services: `kebab-case.service.ts`
- Types: `kebab-case.types.ts`
- Constants: `SCREAMING_SNAKE_CASE`

### Import Order
```ts
// 1. React / React Native
// 2. Expo libraries
// 3. Third-party
// 4. Internal (@ alias)
// 5. Relative
```

### Styling
- **NativeWind v4 (Tailwind)** only — inline styles are forbidden
- No CSS-in-JS or StyleSheet.create

### Forms
- `react-hook-form` + `zod` for all forms — manual form state is forbidden

### Navigation
- `expo-router` only — do not use React Navigation directly
- Prefer `<Link>` over `router.push`

---

## Supabase Rules

```ts
// ✅ Always use the singleton client
import { supabase } from '@/lib/supabase';

// ❌ Never create new instances
import { createClient } from '@supabase/supabase-js';
```

- RLS is active on every table — never bypass it
- `service_role` key is **never** used in client-side code
- Realtime subscriptions must call `channel.unsubscribe()` in `useEffect` cleanup
- Auth session is managed in `useAuthStore` — don't call `supabase.auth.getSession()` in components

---

## Key Business Rules

### Catch Logging
- Photo optional (max 5 MB, JPEG/PNG), compressed to 1200px via `expo-image-manipulator` before upload
- Location: exact coords stored in DB, feed shows fuzzy ±2km unless user enables exact location
- Fish species from `fish_species` dropdown or free text
- Size (cm) and weight (g) are optional

### XP System
| Action | XP |
|---|---|
| First catch ever | 100 |
| Catch log (with photo) | 30 |
| Catch log (no photo) | 10 |
| Catch & Release bonus | +15 |
| Like received | 2 (max 20 XP/day) |
| Comment received | 5 (max 30 XP/day) |
| Daily streak | 10 × streak days (max 50 XP/day) |

### Levels
`Acemi (0 XP) → Balıkçı (500) → Uzman (2000) → Usta (8000) → Kaptan (25000)`

### KVKK Compliance
- Separate consent checkboxes for location and marketing at registration (mandatory, cannot skip)
- All consents logged to `user_consents` with timestamp + IP
- Account deletion cascades all data within 30 days
- Analytics use anonymous session IDs, not user IDs

---

## Performance Rules

- FlatList: always define `getItemLayout` + `keyExtractor`
- Images: `expo-image` with `contentFit="cover"` and blur-hash placeholders
- Heavy operations (image compression): use background tasks
- No barrel imports from lodash — use `import X from 'lodash/X'`

---

## Common Mistakes to Avoid

1. Leaving `console.log` in production — use `__DEV__` guard
2. Writing Supabase queries directly in components — always use service functions
3. Missing `useEffect` dependency arrays
4. Using `router.push` instead of `<Link>`
5. Skipping image compression before upload (must use `expo-image-manipulator`, max 1200px)
6. Writing sensitive data to `AsyncStorage` — Supabase manages sessions
7. Missing `useFocusEffect` cleanup for Android back button

---

## Reference Documentation

Read these before implementing features:
- **New screen / routing:** `architecture.md`
- **DB queries / schema:** `architecture.md`
- **XP / badges / levels:** `gamification.md`
- **Privacy / location:** `kvkk.md`
- **Feature scope / business rules:** `features.md`
- **Security:** `security_best_practices_report.md`

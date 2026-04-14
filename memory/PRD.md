# Olty PRD — Project Requirements & Progress

## Problem Statement
Olty projesi (Expo React Native balıkçılık uygulaması) için kapsamlı iyileştirmeler:
1. UI/UX & Görsel Tasarım — Tutarsız spacing, typography ve renk kullanımını düzelt
2. Kod Kalitesi & Refactoring — Tekrar eden kodları çıkar, custom hook/component'e taşı
3. Performans Optimizasyonu — useMemo, useCallback ile optimizasyon
4. Responsive & Mobil Uyumluluk — Touch target boyutları, overflow sorunları

User Priority: UI/UX & Responsive → Performans & Kod Kalitesi → WeatherWidget özel focus

## Architecture
- **Platform**: Expo SDK 54 / React Native 0.81.5
- **Language**: TypeScript 5.4
- **Styling**: NativeWind 4.2 (Tailwind CSS for RN)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State**: Zustand 5 + TanStack React Query 5
- **Navigation**: Expo Router 6
- **APIs**: Open-Meteo (weather), StormGlass (tides), OpenTopoData (bathymetry)

## What's Been Implemented (Jan 2026)

### Phase 1 — Code Quality & Theme Consistency
- **Created `/app/src/utils/weather.ts`** — Extracted 19 shared utility functions from WeatherWidget and WeatherWidgetCompact, eliminating ~200 lines of duplicate code
  - `getWeatherEmoji`, `getWeatherLabel`, `getWindDirectionLabel`, `getWindDirectionLabelLong`
  - `formatCompact`, `formatHour24`, `formatWindSpeed`, `getPressureTrendArrow`
  - `getHourlyEntriesForDay`, `getHourlyTimelineEntries`, `getDefaultHourlyTime`
  - `getHourlyIndexFromScroll`, `getMaxHourlyOffset`, `getHourlyDayLabel`, `getHourlyLabel`
  - `getScoreColor`, `getScoreTone`, `isGoldenHour`, `getHourPart`

- **Refactored `WeatherWidgetCompact.tsx`** (1595→1540 lines with far better structure):
  - Replaced ALL hardcoded colors (#3B82F6 blue) with centralized T theme (#D4FF00 lime green)
  - Split into 5 React.memo sub-components: DaySelector, MetricCard, ChartSection, DailyForecastRows, DetailsModal
  - Chart line now uses brand color (T.teal) instead of white
  - Dropdown active state uses brand color highlight
  - Score badge text uses dark background color for contrast

- **Refactored `WeatherWidget.tsx`**:
  - Removed 15+ duplicate helper functions, now imports from `@/utils/weather`
  - Improved loading state with icon wrap + descriptive text + skeleton placeholder
  - Improved error state with cloud-offline icon + retry button
  - All touch targets meet 44x44px accessibility minimum

### Phase 1 — UI/UX Improvements
- Loading state: Skeleton placeholder with descriptive text ("Veriler hazırlanıyor...")
- Error state: Cloud-offline icon + clear error message + "Tekrar Dene" retry button
- Touch targets: daySelector (44px), heroScorePill (44px), detailsCloseBtn (44x44px), retryButton (40px)
- Temperature range bar: Uses brand lime color instead of plain white
- Consistent card border radius (20px) across all cards

### Verification
- TypeScript: 0 new errors (2 pre-existing in map.tsx, unrelated)
- ESLint: 0 errors, 0 warnings on all 3 modified files
- Testing Agent: 90% → 100% after touch target fixes

## Prioritized Backlog

### P0 — Critical
- (none remaining for current scope)

### P1 — High Priority
- WeatherWidget.tsx further decomposition (still 1600+ lines)
- Consolidate theme files (theme.ts, design-tokens.ts, sport-theme.ts → single source of truth)
- Add React.memo to WeatherWidget sub-components (ForecastTab, MetricRow, FactorItem, etc.)

### P2 — Medium Priority
- Add entrance animations to WeatherWidgetCompact sections (staggered reveal)
- Add micro-interactions: metric card press animation, chart point highlight on tap
- Improve hourly scroll snapping in WeatherWidget
- Add empty state for when no forecast data is available for future days

### P3 — Low Priority / Future
- Create shared `useHourlyScroll` custom hook for both widgets
- Add accessibility labels to all interactive elements
- Performance profiling with React DevTools Profiler
- Consider splitting weather.service.ts (1824 lines) into smaller modules

## Next Tasks
1. Consolidate 3 theme files into single design system
2. Further decompose WeatherWidget.tsx into sub-components
3. Add entrance animations to weather cards
4. Review and optimize other large components (CatchForm, etc.)

# Olty Launch Checklist

## Supabase Production Setup
- [ ] Project region: EU (Frankfurt) — confirm in Supabase dashboard
- [ ] Point-in-time recovery enabled (PITR) — requires Pro plan
- [ ] Daily backups configured
- [ ] `service_role` key stored in EAS secrets, NOT in .env.local
- [ ] RLS enabled on all tables — run: SELECT tablename FROM pg_tables
      WHERE schemaname='public' AND rowsecurity=false;
      Result must be empty.
- [x] All migrations applied to production: `supabase db push`
- [x] `pg_cron` enabled for daily game jobs
- [x] Edge function deployed: `supabase functions deploy generate-daily-games`
- [x] Daily game function secrets configured:
        `APP_SERVICE_ROLE_KEY`
        `CRON_SHARED_SECRET`
- [x] Daily game DB cron jobs scheduled:
        `public.generate_daily_games_cron()`
        `public.reveal_daily_question_cron()`

## EAS / Expo
- [ ] `eas.json` configured with preview + production profiles
- [x] Required `EXPO_PUBLIC_*` vars set in EAS project dashboard
- [ ] Optional integrations configured in EAS:
      `EXPO_PUBLIC_SENTRY_DSN`
      `EXPO_PUBLIC_POSTHOG_KEY`
      `EXPO_PUBLIC_ONESIGNAL_APP_ID`
      `EXPO_PUBLIC_CF_R2_PUBLIC_URL`
- [ ] EXPO_PUBLIC_SENTRY_DSN set in EAS
- [ ] Android keystore backed up securely (NOT in git)
- [ ] iOS provisioning profile + certificates configured
- [ ] Bundle ID matches App Store Connect: com.olty.app
- [ ] `pnpm check-env` passes in CI

## App Store Connect
- [ ] App created, bundle ID registered
- [ ] Privacy policy URL set
- [ ] App Privacy nutrition label filled (location: approximate, identifiers: user ID)
- [ ] TestFlight internal testing group created
- [ ] First build uploaded via: eas build --platform ios --profile preview

## Google Play Console
- [ ] App created, package name registered
- [ ] Data safety form filled (location: approximate, not shared with 3rd parties)
- [ ] Internal testing track configured
- [ ] First build uploaded via: eas build --platform android --profile preview

## Closed Beta Criteria (before public launch)
- [ ] 50+ beta users, 7 days minimum usage
- [ ] D7 retention > 25%
- [ ] 0 P0 crashes (Sentry)
- [ ] Daily question + fish challenge generating correctly for 3 consecutive days
- [ ] Push notifications delivered on both iOS and Android
- [ ] KVKK consent flow tested end-to-end
- [ ] Account deletion flow tested (request → 30-day schedule)

## Admin Setup
- [ ] Set is_admin=true for your user in Supabase dashboard:
      UPDATE profiles SET is_admin=true WHERE username='your_username';
- [ ] Generate first week's daily questions via admin panel
- [ ] Create first weekly challenge via admin panel
- [ ] Seed 10 fish species records (from migration 004 — confirm applied)

## First Week Content Plan
Day 1: Daily question type = species_count
Day 2: Daily question type = time_of_day
Day 3: Fish ID challenge (select from seed catches)
Day 4: Daily question type = bait_type
Day 5: Fish ID challenge
Day 6: Weekly challenge leaderboard push notification (manual trigger)
Day 7: Reveal + award weekly challenge winners

# Olty Security Audit

Date: 2026-03-24

Scope:
- Expo / React Native client
- Supabase migrations, RLS policies, storage policies
- Supabase edge functions

Method:
- Static review of client code, migrations, and edge functions in this repository
- Focus on directly exploitable authorization, data exposure, and abuse risks

## Executive Summary

The most important risks are on the Supabase backend boundary, not in UI code.

Top issues:
1. A service-role-backed edge function can be invoked without request-level authorization checks.
2. A paid OpenAI-backed edge function has no visible request authentication or abuse controls.
3. Direct-message inserts do not verify conversation membership.
4. Notifications can be inserted by any authenticated caller.
5. Like/comment insert policies do not verify that the actor is allowed to access the target catch.

If this app is shipped as-is, the highest-priority fixes are:
- lock down edge functions,
- tighten RLS for `messages`, `notifications`, `likes`, and `comments`,
- then move session storage from plain AsyncStorage to a secure mobile store.

## Findings

### 1. Critical: `generate-daily-games` can run service-role writes without request-level auth checks

Severity: Critical

Evidence:
- [supabase/functions/generate-daily-games/index.ts:4](supabase/functions/generate-daily-games/index.ts#L4)
- [supabase/functions/generate-daily-games/index.ts:5](supabase/functions/generate-daily-games/index.ts#L5)
- [supabase/functions/generate-daily-games/index.ts:6](supabase/functions/generate-daily-games/index.ts#L6)
- [supabase/functions/generate-daily-games/index.ts:225](supabase/functions/generate-daily-games/index.ts#L225)
- [supabase/functions/generate-daily-games/seed-today.ts:3](supabase/functions/generate-daily-games/seed-today.ts#L3)
- [supabase/functions/generate-daily-games/seed-today.ts:8](supabase/functions/generate-daily-games/seed-today.ts#L8)

Why this matters:
- The function creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY`.
- The handler does not verify caller identity, role, or a shared secret before generating or revealing daily game data.
- The repository includes a caller script that hits the function with `SUPABASE_ANON_KEY`, which strongly suggests the endpoint is expected to accept non-privileged callers.

Impact:
- Anonymous or low-privilege callers may be able to trigger privileged writes repeatedly.
- Attackers could regenerate daily content, force reveal flows, or burn function/database capacity.

Recommended fix:
- Require a signed JWT and explicitly verify the caller is an admin/service actor before any privileged action.
- Better: split `generate` and `reveal` into internal-only endpoints and validate a shared secret header in addition to auth.
- Remove or restrict any anon-key invocation path.

### 2. High: `identify-fish` exposes a paid OpenAI proxy without visible auth or rate limiting

Severity: High

Evidence:
- [supabase/functions/identify-fish/index.ts:4](supabase/functions/identify-fish/index.ts#L4)
- [supabase/functions/identify-fish/index.ts:6](supabase/functions/identify-fish/index.ts#L6)
- [supabase/functions/identify-fish/index.ts:7](supabase/functions/identify-fish/index.ts#L7)
- [supabase/functions/identify-fish/index.ts:30](supabase/functions/identify-fish/index.ts#L30)
- [supabase/functions/identify-fish/index.ts:48](supabase/functions/identify-fish/index.ts#L48)
- [supabase/functions/identify-fish/index.ts:52](supabase/functions/identify-fish/index.ts#L52)
- [src/services/fishId.service.ts:25](src/services/fishId.service.ts#L25)

Why this matters:
- The function forwards client-supplied image data to OpenAI using `OPENAI_API_KEY`.
- CORS is wildcard and the handler does not verify a Supabase user or subscription level.
- No request size guard, per-user quota, or rate limit is visible in repo code.

Impact:
- Attackers can use your backend as a paid inference proxy.
- Cost abuse and denial-of-wallet are plausible.
- Large payloads can increase function memory/bandwidth pressure.

Recommended fix:
- Require authenticated users and verify JWT claims in the function.
- Add per-user daily quota and rate limiting.
- Enforce maximum request body size and accepted MIME types.
- Log usage by user id and reject unauthenticated requests early.

### 3. High: message insert policy does not verify conversation membership

Severity: High

Evidence:
- [supabase/migrations/017_direct_messages.sql:46](supabase/migrations/017_direct_messages.sql#L46)
- [supabase/migrations/017_direct_messages.sql:47](supabase/migrations/017_direct_messages.sql#L47)
- [supabase/migrations/017_direct_messages.sql:48](supabase/migrations/017_direct_messages.sql#L48)
- [src/services/messages.service.ts:188](src/services/messages.service.ts#L188)
- [src/services/messages.service.ts:197](src/services/messages.service.ts#L197)

Why this matters:
- `messages_select` correctly checks conversation membership.
- `messages_insert` only checks `sender_id = auth.uid()`.
- It does not verify that `auth.uid()` is `participant_1` or `participant_2` in the referenced conversation.

Impact:
- Any authenticated user who learns a valid `conversation_id` can inject messages into a conversation they do not belong to.
- The trigger then updates `last_message` and `last_message_at`, which can disturb the real participants and downstream notifications.

Recommended fix:
- Replace the insert policy with a membership check:

```sql
create policy "messages_insert" on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
  )
);
```

### 4. High: any authenticated user can insert arbitrary notifications

Severity: High

Evidence:
- [supabase/migrations/021_notifications.sql:71](supabase/migrations/021_notifications.sql#L71)
- [supabase/migrations/021_notifications.sql:72](supabase/migrations/021_notifications.sql#L72)

Why this matters:
- The repo changed notification insert policy from service-role-only to `with check (true)`.
- That means any authenticated caller can attempt direct inserts into `public.notifications`.

Impact:
- Users can forge notifications for any `user_id`.
- This enables spam, phishing-style social engineering, badge/level confusion, and noisy activity feeds.

Recommended fix:
- Restore service-role-only insert policy.
- If client-originated notification writes are truly needed, create a narrow RPC/edge function that validates caller intent and target ownership.

### 5. High: like/comment write policies do not enforce access to the target catch

Severity: High

Evidence:
- [supabase/migrations/002_rls_policies.sql:41](supabase/migrations/002_rls_policies.sql#L41)
- [supabase/migrations/002_rls_policies.sql:42](supabase/migrations/002_rls_policies.sql#L42)
- [supabase/migrations/002_rls_policies.sql:44](supabase/migrations/002_rls_policies.sql#L44)
- [supabase/migrations/002_rls_policies.sql:57](supabase/migrations/002_rls_policies.sql#L57)
- [supabase/migrations/002_rls_policies.sql:59](supabase/migrations/002_rls_policies.sql#L59)
- [supabase/migrations/007_private_accounts.sql:2](supabase/migrations/007_private_accounts.sql#L2)
- [src/services/social.service.ts:20](src/services/social.service.ts#L20)
- [src/services/social.service.ts:175](src/services/social.service.ts#L175)

Why this matters:
- Catch read access is restricted by account privacy and follow state.
- But `likes_insert_own` and `comments_insert_own` only verify the acting user id, not that the acting user is allowed to access the target catch.
- If a private catch UUID leaks anywhere, an attacker can likely like/comment on it even without permission.

Impact:
- Private or non-visible content can still receive unauthorized interaction.
- Notification triggers can then reveal activity to the owner on content the attacker should not be able to reach.

Recommended fix:
- Add `exists (...)` checks in `likes` and `comments` insert policies that mirror catch visibility rules.
- Prefer centralizing catch-access logic in a SQL function to avoid policy drift.

### 6. Medium: storage write policies for `catch-photos` and `avatars` are not represented in migrations

Severity: Medium

Evidence:
- [supabase/migrations/015_storage_and_badge_policies.sql:1](supabase/migrations/015_storage_and_badge_policies.sql#L1)
- [supabase/migrations/015_storage_and_badge_policies.sql:6](supabase/migrations/015_storage_and_badge_policies.sql#L6)
- [supabase/migrations/027_gear_photo_storage.sql:5](supabase/migrations/027_gear_photo_storage.sql#L5)
- [src/services/storage.service.ts:62](src/services/storage.service.ts#L62)
- [src/services/storage.service.ts:72](src/services/storage.service.ts#L72)

Why this matters:
- The repository defines public read policies for `catch-photos` and `avatars`.
- It only defines explicit authenticated write policies for `gear-photos`.
- The app uploads to `catch-photos` and `avatars`, but the governing write/delete rules are not present in repo migrations.

Impact:
- Environment drift is likely: local repo does not fully describe production storage authorization.
- If the remote project has permissive dashboard-created policies, cross-user object overwrite/upload risk may exist.
- If the remote project has no matching policies, uploads fail unpredictably.

Recommended fix:
- Commit explicit insert/update/delete policies for `catch-photos` and `avatars`.
- Scope writes to `storage.foldername(name)[1] = auth.uid()::text`, same as `gear-photos`.
- Avoid relying on dashboard-only storage config.

### 7. Medium: mobile auth session is stored in AsyncStorage instead of platform secure storage

Severity: Medium

Evidence:
- [src/lib/supabase.ts:4](src/lib/supabase.ts#L4)
- [src/lib/supabase.ts:15](src/lib/supabase.ts#L15)
- [src/lib/supabase.ts:20](src/lib/supabase.ts#L20)

Why this matters:
- AsyncStorage is accessible to the JS runtime and is weaker than Keychain/Keystore-backed storage.
- On rooted/jailbroken devices or compromised debug builds, tokens are easier to extract.

Impact:
- Session theft risk is higher than necessary for a production mobile app.

Recommended fix:
- Replace Supabase auth storage with `expo-secure-store` or another secure-store adapter.
- Keep the Expo Go iOS workaround separate from production storage behavior.

## Positive Notes

These areas are in better shape than the risky ones above:
- Many owner-scoped writes already enforce `auth.uid() = user_id`.
- Catch detail visibility is pushed into SQL views, which is better than UI-only hiding.
- Admin writes for daily/weekly game content use DB-side `is_admin()` checks instead of frontend-only gating.

## Recommended Remediation Order

1. Lock down `generate-daily-games`.
2. Lock down `identify-fish` with auth, quotas, and request limits.
3. Fix `messages_insert`.
4. Restore service-role-only notification inserts.
5. Tighten `likes` and `comments` insert policies to require catch visibility.
6. Commit full storage policies for `avatars` and `catch-photos`.
7. Move auth token storage to secure storage.

## Residual Gaps

This audit was repository-based. I did not validate:
- live Supabase dashboard-only config not present in migrations,
- current production edge-function deployment settings,
- dependency CVE status from network package advisories,
- mobile runtime hardening such as jailbreak/root detection.

Those should be checked in a second pass if you want a release-grade audit.
